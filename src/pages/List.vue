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
    <button class="btn-lg" @click="fetchList" :disabled="loading">
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
  <div v-if="!loading && list.length > 0" class="transaction-list">
    <article
      v-for="item in list"
      :key="item.id"
      class="card transaction-card"
      :class="{ unchecked: item.check === false }"
    >
      <!-- チェックボックス -->
      <div class="card-left">
        <div
          class="transaction-card-header"
          v-if="item.check === false"
        >
          <input
            type="checkbox"
            :checked="selectedCheckId === item.id"
            @change="selectedCheckId = $event.target.checked ? item.id : null"
          ><span>支払い確認</span>

          <!-- チェックを入れたときだけ更新ボタンを表示 -->
          <div
            v-if="selectedCheckId === item.id"
            class="check-update-btn"
          >
            <button
              class="btn-sm check-btn"
              @click="updateCheck(item.id)"
              :disabled="isLoading"
            >
              更新
            </button>
          </div>
        </div>
      
      </div>
      <!-- 日付 -->
      <div class="card-center">
        <div class="transaction-date">
          <span>{{ new Date(item.date).getFullYear() }} / {{ formatMD(item.date) }}</span>
          <span></span>
        </div>

        <!-- 大項目・小項目 -->
        <div class="transaction-category">
          {{ item.large }} ／ {{ item.small }}
        </div>

        <!-- 店名 -->
        <div class="transaction-shop">
          {{ item.shop }}
        </div>

        <!-- 内容 -->
        <div class="transaction-description">
          {{ item.naiyo }}
        </div>

        <!-- 金額 -->
        <div class="card-amount-center">
          <span
            class="card-amount"
            :class="{
              'amount-negative' : item.amount < 0,
              'amount-plus': item.amount >= 0
            }"
          >
            {{ item.amount }}円
          </span>
        </div>
      </div>
      <div class="card-right">
        <button class="btn-sm edit-btn" @click="goEdit(item.id)">
          修正
        </button>
      </div>
    </article>
  </div>

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

  // ローディング
  const isLoading = ref(false)
  /* GASから一覧データ取得 */
  // 入力項目
  const periodStart = ref("")
  const periodEnd = ref("")
  const large = ref("")
  const small = ref("")
  const keyword = ref("")
  
  const selectedCheckId = ref(null)

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
  const updateCheck = async (id) => {
    if (id == null) {
      alert("更新するデータがありません")
      return
    }

    isLoading.value = true

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          mode: "updateCheck",
          id: String(id),
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTPエラー: ${res.status}`)
      }

      const result = await res.json()
      console.log("更新結果:", result)

      // GAS側の成功判定に合わせて調整する
      if (result.success === false) {
        throw new Error(result.message || "更新に失敗しました")
      }

      alert("チェック済みに更新しました")

      selectedCheckId.value = null
      await fetchList()

    } catch (e) {
      console.error("更新エラー", e)
      alert("更新に失敗しました")

    } finally {
      isLoading.value = false
    }
  }
  

  //修正画面に移動する
  const goEdit = (id) => {
    router.push({
      name: "edit",     // ルート名（後で説明）
      query: { id }  // 修正したいid
    })
  }

</script>


<style scoped>

/* 一覧全体 */
.transaction-list {
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* カード全体 */
.transaction-card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-2);

  width: 100%;
  box-sizing: border-box;
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

/* 左端：チェックボックス＋縦書き文字 */
.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding-top: 4px;
  min-width: 32px;
}

/* チェックボックス */
.card-left input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-surface);
}

/* 確認チェックの縦書き */
.check-label {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-muted);
  white-space: nowrap;
}

/* 中央：日付・内容・金額 */
.card-center {
  min-width: 0;
  text-align: center;
  overflow-wrap: anywhere;
}

/* 日付 */
.transaction-date {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-2);
  font-variant-numeric: tabular-nums;
}

.transaction-date span:first-child {
  font-size: 14px;
}

.transaction-date span:last-child {
  font-size: 11px;
  color: var(--color-muted);
}

/* 項目 */
.transaction-category {
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.transaction-shop,
.transaction-description {
  margin-bottom: var(--space-2);
}

/* 金額 */
.card-center {
  min-width: 0;
  text-align: center;
  overflow-wrap: anywhere;
}

/* 金額 */
.card-amount {
  text-align: center;
  width: 100%;
}

.card-amount.minus {
  color: var(--color-danger);
}

.card-amount.plus {
  color: var(--color-text);
}

/* チェック更新ボタン */
.check-update-btn {
  margin-top: var(--space-3);
}

/* 右端：修正ボタン */
.card-right {
  display: flex;
  justify-content: flex-end;
}


/* 未チェック */
.transaction-card.unchecked {
  border-left: 4px solid var(--color-danger);
  background: var(--color-danger-bg);
}

/* 日付とチェックボックス */
.transaction-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.transaction-date {
  display: flex;
  flex-direction: column;
  font-variant-numeric: tabular-nums;
}

.transaction-date span:first-child {
  font-size: 14px;
}

.transaction-date span:last-child {
  font-size: 11px;
  color: var(--color-muted);
}

/* カテゴリ */
.transaction-category {
  font-weight: 600;
  overflow-wrap: anywhere;
  margin-bottom: var(--space-2);
}

/* 店名・内容 */
.transaction-shop,
.transaction-description {
  overflow-wrap: anywhere;
  margin-bottom: var(--space-2);
}

/* 金額・修正ボタン */
.transaction-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.card-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 32px;
}

.transaction-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.transaction-card-header input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--color-beige);
}

/* 「支払い確認」を縦書きにする */
.transaction-card-header > span {
  writing-mode: vertical-rl;
  text-orientation: upright;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-muted);
}

/* チェック更新ボタン */
.check-update-btn {
  margin-top: 8px;
}

.check-btn,.edit-btn {
  margin-left: auto;
  margin-right: 0;
  min-height: 20px;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
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

}


@media(max-width: 360px) {

  .row {
    flex-wrap: wrap;
  }

  .form-label {
    flex-basis: 100%;
  }
}
</style>