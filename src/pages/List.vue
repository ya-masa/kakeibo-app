<template>  
  <AppLinks />
    <!-- この下にフィルタや一覧 -->
  <div class="list-page">
    <p>検索条件を入れてください</p>
    <div class="search-box">
      <!-- 条件入力フォーム -->
      <!-- ① 期間 -->
      <div class="filter-row">
        <div><label>期間</label>
          <input type="date" v-model="periodStart" :max="periodEnd || null"></div>
        <div><label>〜</label>
          <input type="date" v-model="periodEnd" :min="periodStart || null"></div>
      </div>

      <!-- ② 大項目・小項目 -->
      <div class="filter-row">
        <div>
          <label>大項目</label>
          <select v-model="large">
            <option value="">（すべて）</option>
            <option v-for="item in categoriesLarge" :key="item" :value="item">
              {{ item }}
          </option>
        </select>
        </div>
        <div>
        <label>小項目</label>
          <select v-model="small">
            <option value="">（すべて）</option>
            <option v-for="item in categoriesSmall" :key="item" :value="item">
              {{ item }}
            </option>
          </select>
        </div>
      </div>

      <!-- ③ メモ・相手 -->
      <div class="filter-row">
        <label>キーワード</label>
        <input type="text" v-model="keyword" placeholder="店名・メモを検索">
      </div>
    </div>
    <!-- 表示ボタン -->
    <button @click="fetchList" :disabled="loading">
      表  示
    </button>

    <!-- ローディング -->
    <div class="loading-area">
      <LoadingIcon :show="isLoading" v-show="isLoading"/>
    </div>
    
    <LoadingIcon :show="globalLoading" v-show="globalLoading"/>
    <!-- 一覧表示 -->
    <table v-if="!loading && list.length > 0" class="list-table">
      <thead>
        <tr>
          <th><button @click="updateCheck">更新</button></th>
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
            <button @click="goEdit(item.rowNo)">修正</button>
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
  .search-box {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
    background-color: #f7f3ee;
    float: center;
  }

  .filter-row label {
    width: 80px;
    font-weight: 600;
    flex-shrink: 0;
    text-align: center;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap; /* ← スマホで折り返す */
  }

  /* input や select の幅を揃える */
  .filter-row div input[type="date"],
  .filter-row div select,
  .filter-row input[type="text"] { 
    height:44px;
    padding:10px 12px;
    font-size:16px;
    width: 70%;      /* ← ここで固定 */
    min-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .filter-row div {
  display: flex;
  align-items: center;
  }

  .filter-row div select {
  flex-shrink: 0;   /* 幅が縮まないように */
  }
  
  .unchecked {
    color: red;/*未チェックのものは赤色に */
  }

  .minus {
    color: red;/*金額がマイナスの時は赤色*/
  }

  .plus {
    color: black;/*金額がプラスなら黒で*/
  }
  button {
    width: 100%;
    padding: 12px;
    background: #c8a27e;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
  }
  button:hover {
    background: #6b4f3f;
    color: #fff;
    border-color: #c8a27e;
  }


  .list-page {
    padding: 10px;
  }


  .loading-area {
    text-align: center;
    margin-top: 40px;
  }

  .loading-icon {
    width: 60px;
    height: 60px;
  }

  .list-table {
    max-width: 100%;
    border-collapse: collapse;
  }
  .list-table tr{
    border-bottom: 1px solid #ddd;
  }
  .list-table th,
  .list-table td {
    text-align: left;
    /*border-bottom: 1px solid #ddd;*/
    /*min-height:80px;*/
    padding: 5px;
    align-items: stretch;
  }

  .amount {
    text-align: right;
  }
  /*リスト表示のCSS*/
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
  @media (max-width: 400px) {
    .filter-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-row label {
      width: 80px;
    }
    .filter-row input,
    .filter-row select{
      min-width: 280px;
      width: 90%;
    }
  }
</style>