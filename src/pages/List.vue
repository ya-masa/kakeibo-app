<template>
<div class="continer">
  <!-- この下にフィルタや一覧 -->
  <div class="card">
    <div class="row">
      <label class="form-label">期間</label>
      <input type="date" v-model="periodStart" class="input-field">
        <!-- 曜日は表示しない -->
        <span v-if="false">（{{ weekday }}）</span>
      <span>〜</span>
      <input type="date" v-model="periodEnd" class="input-field">
        <!-- 曜日は表示しない -->
        <span v-if="false">（{{ weekday }}）</span>
    </div>

    <div class="row">
      <label class="form-label">大項目</label>
      <select v-model="large" class="select-field">
        <option value="">（すべて）</option>
        <option v-for="item in categoriesLarge" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>

    <div class="row">
      <label class="form-label">小項目</label>
      <select v-model="small" class="select-field">
        <option value="">（すべて）</option>
        <option v-for="item in categoriesSmall" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>

    <div class="row">
      <label class="form-label">キーワード</label>
      <input type="text" v-model="keyword" class="input-field" placeholder="店名・メモを検索">
    </div>
    <!-- 表示ボタン -->
    <button class="btn" @click="fetchList" :disabled="loading">
      表示
    </button>
  </div>
</div>

  <!-- ローディング -->
  <div class="loading-area">
    <LoadingIcon :show="isLoading" v-show="isLoading"/>
  </div>
  
  <LoadingIcon :show="globalLoading" v-show="globalLoading"/>
  <!-- 一覧表示 -->
  <div class="has-footer">
    <table v-if="!loading && list.length > 0" class="table">
      <thead>
        <tr>
          <th>☑<br><button class="check-btn" @click="updateCheck">更新</button></th>
          <th>日付</th>
          <th>大項目<br>小項目</th>
          <th>店名</th>
          <th>内容</th>
          <th>金額</th>
          <th>修正</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          class="tr-check"
          v-for="item in list" 
          :key="item.id"
          :class="{
            unchecked: item.check === false
          }"
        >
        <td>
          <!-- チェックが false のときだけ表示 -->
          <input 
            type="checkbox" 
            v-if="item.check === false"
            :value="item.id"
            v-model="selectedIds"
          >
        </td>
          <td class="date"
          :data-year="new Date(item.date).getFullYear()"
          :data-md="formatMD(item.date)">
        </td>
          <td>{{ item.large }}<br>{{ item.small }}</td>
          <td>{{ item.shop }}</td>
          <td>{{ item.naiyo }}</td>
          <td 
            class="amount"
            :class="{
              minus: item.amount < 0,
              plus: item.amount >= 0
            }"
          >
            {{ item.amount }}
          </td>
            <!-- ここに修正ボタンを置く -->
          <td>
            <button class="btn" @click="goEdit(item.id)">修正</button>
          </td>
          <hr>
        </tr>
      </tbody>
    </table>

    <p v-if="!loading && list.length === 0">
      条件に一致するデータがありません。
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch ,onMounted} from "vue"
import { GAS_URL } from "@/constants/index.js"
import loadingStore from "@/stores/loadingStore"
import { fetchCategories } from "@/services/categories.js"
import LoadingIcon from "@/components/LoadingIcon.vue"
import AppLinks from '@/components/AppLinks.vue'
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

// 未確認データだけを検索するか
const uncheckedOnly = ref(false)

  //修正画面に移動する
  const goEdit = (id) => {
    router.push({
      name: "edit",     // ルート名（後で説明）
      query: { id }  // 修正したいid
    })
  }
  // ローディング
  const isLoading = ref(false)
  /* GASから一覧データ取得 */
  // 入力項目
  const periodStart = ref("")
  const periodEnd = ref("")
  const large = ref("")
  const small = ref("")
  const keyword = ref("")

  // チェックされた id を保持
  const selectedIds = ref([])

  // カテゴリ取得
  const categoriesData = ref({})
  fetchCategories().then(data => {
    categoriesData.value = data
  })
  // start日付 がクリアされたら end日付 もクリア
  watch(periodStart, (value) => {
    if (!value) periodEnd.value = ""
  })

  // end日付 がクリアされたら start日付 もクリア
  watch(periodEnd, (value) => {
    if (!value) periodStart.value = ""
  })

  // 大項目一覧
  const categoriesLarge = computed(() => {
    if (!Array.isArray(categoriesData.value)) return []
    const row = categoriesData.value.find(item => item.large === "大項目")
    return row ? row.small : []
  })

  // 小項目を先に選んだ時は、大項目を自動補完
  watch(small, (newSmall) => {
    if (!newSmall) return
    if (!Array.isArray(categoriesData.value)) return

    const found = categoriesData.value.find(item =>
      item.small.includes(newSmall)
    )
    if (found) large.value = found.large
  })

  // 小項目一覧
  const categoriesSmall = computed(() => {
    const data = categoriesData.value
    if (!Array.isArray(data)) return []

    if (!large.value) {
      return [...new Set(
        data
          .filter(item => item.large !== "大項目")
          .flatMap(item => item.small)
      )]
    }
    const found = data.find(item => item.large === large.value)
    return found ? found.small : []
  })

//月日を変換する関数
function formatMD(dateStr) {
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(1, '0')
  const day = String(d.getDate()).padStart(1, '0')
  return `${m}/${day}`
}
  onMounted(async () => {
    // HOME画面から条件が渡された場合
    if (route.query.start && route.query.end) {
      periodStart.value = String(route.query.start)
      periodEnd.value = String(route.query.end)
      uncheckedOnly.value = route.query.unchecked === "true"

      // 条件をセットして自動検索
      await fetchList()
      console.log("検索条件", {
        start: periodStart.value,
        end: periodEnd.value,
        unchecked: uncheckedOnly.value
      })

    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingStore.globalLoading.value = false
        }, 500)
      })
    })
  })
  // 一覧データ
  const list = ref([])

  // 一覧取得
  const fetchList = async () => {
    isLoading.value = true
    list.value = []
    selectedIds.value = []

  const params = new URLSearchParams({
    list: "sortlist",
    start: periodStart.value,
    end: periodEnd.value,
    big: large.value,
    small: small.value,
    keyword: keyword.value,
    unchecked: uncheckedOnly.value ? "true" : "false"
  })

    try {
      const res = await fetch(`${GAS_URL}?${params}`)
      const data = await res.json()
      list.value = data
    } catch (e) {
      console.error("一覧取得エラー", e)
    }
    isLoading.value = false
  }

  // チェック更新（Vue → GAS）
  const updateCheck = async () => {
    if (selectedIds.value.length === 0) {
      alert("チェックがありません")
      return
    }
    isLoading.value=true
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          mode: "updateCheck",   // ← ここに置くのが正しい
          ids: selectedIds.value
        })
      })

      const result = await res.json()
      console.log("更新結果:", result)

      alert("更新しました")
      selectedIds.value = []
      fetchList()

    } catch (e) {
      console.error("更新エラー", e)
      isLoading.value=false
    }
  }


</script>


<style scoped>
.continer {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
}

.card {
  background: var(--color-greige-light, #F7F4EF);
  border: 1px solid var(--color-border, #EEE7DF);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  box-sizing: border-box;
  min-width: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  min-width: 0;
}

.form-label {
  flex: 0 0 76px;
  color: var(--color-brown-dark, #5B4636);
  font-size: 14px;
}

.input-field,
.select-field {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #EEE7DF);
  border-radius: 8px;
  background: var(--color-surface, #F5E8D8);
  color: var(--color-brown-dark, #5B4636);
  font: inherit;
}

.btn,
.check-btn {
  border: 1px solid var(--color-border, #EEE7DF);
  border-radius: 8px;
  padding: 9px 14px;
  background: var(--color-beige, #C8A27E);
  color: var(--color-brown-dark, #5B4636);
  cursor: pointer;
  font: inherit;
}

.card > .btn {
  min-width: 88px;
  display: block;
  margin-left: auto;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-area {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.has-footer {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 12px 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table {
  width: max-content;
  min-width: 760px;
  border-collapse: collapse;
  border: 1px solid var(--color-border, #EEE7DF);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-greige-light, #F7F4EF);
  color: var(--color-brown-dark, #5B4636);
  font-size: 14px;
}

.table th,
.table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border, #EEE7DF);
  text-align: center;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.table th {
  background: var(--color-surface, #F5E8D8);
  color: var(--color-brown-dark, #5B4636);
  font-weight: 600;
  white-space: nowrap;
}

.table tbody tr:last-child td {
  border-bottom: 0;
}

.table tbody tr.unchecked {
  color: var(--color-red-dark, #A94442);
}

.table .amount {
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.table .minus {
  color: var(--color-red-dark, #A94442);
}

.table .plus {
  color: var(--color-brown-dark, #5B4636);
}

.table td.date {
  min-width: 64px;
  white-space: nowrap;
}

.table td.date::before {
  content: attr(data-year) " / " attr(data-md);
  display: inline-block;
  white-space: nowrap;
  font-size: 13px;
  padding-top: 0;
}

.table td.date::after {
  content: none;
  display: none;
}

.tr-check {
  text-align: center;
}

.table input[type="checkbox"] {
  accent-color: var(--color-coffee, #6b4f3f);
  width: 18px;
  height: 18px;
}

@media (max-width: 600px) {
  .continer {
    padding: 8px;
  }

  .card {
    padding: 12px;
    border-radius: 12px;
  }

  .row {
    gap: 8px;
  }

  .form-label {
    flex-basis: 64px;
    font-size: 13px;
  }

  .input-field,
  .select-field {
    padding: 9px 8px;
    font-size: 14px;
  }

  .has-footer {
    padding-left: 8px;
    padding-right: 8px;
  }

  .table {
    width: max-content;
    min-width: 760px;
    font-size: 13px;
  }

  .table th,
  .table td {
    padding: 8px 6px;
  }
}

@media (max-width: 360px) {
  .row {
    flex-wrap: wrap;
  }

  .form-label {
    flex-basis: 100%;
  }
}
</style>