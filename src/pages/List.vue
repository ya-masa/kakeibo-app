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
          :key="item.rowNo"
          :class="{
            unchecked: item.check === false
          }"
        >
        <td>
          <!-- チェックが false のときだけ表示 -->
          <input 
            type="checkbox" 
            v-if="item.check === false"
            :value="item.rowNo"
            v-model="selectedRows"
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
            <button class="btn" @click="goEdit(item.rowNo)">修正</button>
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

// ローディング
const isLoading = ref(false)
/* GASから一覧データ取得 */
  // 入力項目
  const periodStart = ref("")
  const periodEnd = ref("")
  const large = ref("")
  const small = ref("")
  const keyword = ref("")

  // チェックされた rowNo を保持
  const selectedRows = ref([])

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

onMounted(() => {
  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // ここでローディングを消す（長めにしたいなら調整）
    setTimeout(() => {
      loadingStore.globalLoading.value = false
    }, 500) // ← ここを好きな時間にできる
    })
  })
})
// 一覧データ
const list = ref([])

// 一覧取得
const fetchList = async () => {
  isLoading.value = true
  list.value = []
  selectedRows.value = []

  const params = new URLSearchParams({
    list: "sortlist",
    start: periodStart.value,
    end: periodEnd.value,
    big: large.value,
    small: small.value,
    keyword: keyword.value
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
  if (selectedRows.value.length === 0) {
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
        rows: selectedRows.value
      })
    })

    const result = await res.json()
    console.log("更新結果:", result)

    alert("更新しました")
    selectedRows.value = []
    fetchList()

  } catch (e) {
    console.error("更新エラー", e)
    isLoading.value=false
  }
}

//修正画面に移動する
import { useRouter } from "vue-router"
const router = useRouter()
const goEdit = (rowNo) => {
  console.log("rowNo="+rowNo)
  router.push({
    name: "edit",     // ルート名（後で説明）
    query: { rowNo }  // 修正したい行番号
  })
}
</script>


<style scoped>

/*　日付の表示用CSS */
td.date {
  display: flex;
  flex-direction: column;
  align-items: center;
}

td.date::before {
  content: attr(data-md);
  font-size: 20px;
  padding-top: 10px;
}

td.date::after {
  content: attr(data-year);
  font-size: 14px;
  opacity: 0.6;
}
/*チェック関連 */
.tr-check{
  text-align: center;
}
.check-btn{
  background: var(--beige);
  color: var(--coffee);
  border: 1px solid var(--coffee);
  padding:10px;
  border-radius: 6px;
}
  /* マイナス時の赤表示　
  　　未チェック時の赤表示*/
  .unchecked {
    color: var(--red-dark);/*未チェックのものは赤色に */
  }

  .minus {
    color: var(--red-dark);/*金額がマイナスの時は赤色*/
    text-align: right;
  }

  .plus {
    color: var(--dark-brown);/*金額がプラスなら黒で*/
    text-align: right;
  }


  /*リスト表示の日付CSS*/
  td.date{
  display: flex;    /* ← inline-flex ではなく flex にする */
  flex-direction: column;
  /*justify-content: center; /* 中央揃え */
  align-items:center;
}

/* 年 */
td.date::before {
  content: attr(data-md);
  font-size: 20px;
  padding-top:10px;
  /*font-weight: bold;*/
}

/* 月日 */
td.date::after {
  content: attr(data-year);
  font-size: 14px;
  opacity: 0.6;      /* 薄くして控えめに */
}


  
  /* スマホ用（幅が狭いときは縦並びに） */
  @media (max-width: 375px) {
    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

  }
</style>