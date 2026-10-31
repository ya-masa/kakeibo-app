<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { GAS_URL } from '@/constants/index.js'
  import loadingStore from "@/stores/loadingStore"
  import { getAccountIcon } from '@/components/accountIcons'
  import {Store} from "lucide-vue-next";

  /* GASから取得した生データ */
  const rawList = ref([])

  /* モード：100=資産, 200=負債, 400=収入, 500=支出 */
  const mode = ref(500)
  
  //トグルボタンを押したときの動作
  var openedCode = ref(null)

  /* GASから一覧データ取得 */
  onMounted(async () => {
      const res = await fetch(`${GAS_URL}?list=ALLLIST`)
      console.log("ALLLIST:")
      const all = await res.json()

      rawList.value = all
      console.log("rawList:",rawList)
      // ローディング解除
      requestAnimationFrame(() => {
          requestAnimationFrame(() => {
          setTimeout(() => {
              loadingStore.globalLoading.value = false
          }, 10)
          })
      })
  })

  /* モードに応じて group を決める */
  const modeGroup = computed(() => {
    if (mode.value === 100) return "1_資産"
    if (mode.value === 200) return "2_負債"
    if (mode.value === 400) return "4_収入"
    if (mode.value === 500) return "5_支出"
  })

  /* 大項目ごとにカード化する */
  const categories = computed(() => {
  const list = rawList.value.filter(i => i.group === modeGroup.value)

  const map = {}

  list.forEach(item => {
    if (!map[item.daikoumoku]) {
      map[item.daikoumoku] = {
        daikoumoku: item.daikoumoku,
        daikoumokuCode: Math.floor(item.code / 10) * 10, // 大項目コード
        items: []
      }
    }
    map[item.daikoumoku].items.push({
      code: item.code,
      shoukoumoku: item.shoukoumoku,   // ← name ではなく shoukoumoku に統一
      disabled: item.hihyouji === true,
      order: item.hihyouji === true ? null : item.hihyouji,
      shops: normalizeShops(item.shops ?? [])
    })
  })

  // 🔥 小項目を code 順に並べ替え
  Object.values(map).forEach(category => {
    category.items.sort((a, b) => a.code - b.code)
  })
  // 🔥 大項目も code 順に並べ替え
  return Object.values(map).sort((a, b) => a.daikoumokuCode - b.daikoumokuCode)
  })

  //トグルボタンを押したときの動作
  const toggle = (code) => {
    console.log("toggle:", code)
    openedCode.value = openedCode.value === code ? null : code
  }
  
  //更新ボタン押下時の処理
  const update = async (item) => {
  loadingStore.globalLoading.value = true;

  try {
    const payload = new URLSearchParams();

    payload.append("mode", "shops");
    payload.append("code", item.code);
    payload.append("group", modeGroup.value);          // ← item.group は存在しないので修正
    payload.append("daikoumoku", item.daikoumoku);     // ← daikomoku → daikoumoku に修正
    payload.append("shoukoumoku", item.shoukoumoku);
    payload.append("hihyouji", item.disabled ? true : false);
    payload.append("shops", JSON.stringify(item.shops)); // ← 配列は JSON にするのが安全

    const res = await fetch(`${GAS_URL}?mode=shops`, {
      method: "POST",
      body: payload
    });

    const result = await res.json();
    alert(result.message);

    // 🔥 更新成功 → dirty を消す
    item.dirty = false;

  } catch (e) {
    alert("更新に失敗しました: " + e.message);
  }

  loadingStore.globalLoading.value = false;
  };


function normalizeShops(shops) {
  const result = [];

  for (let i = 0; i < 10; i++) {
    result.push(shops[i] || "");   // 足りない分は空欄
  }

  return result;
}
</script>

<template>
  <div class="settings-wrapper">
    <div class="menu-icon">
      <Store :size="24" />
    </div>

    <div class="menu-text">
      <div class="menu-title">
        よく使うお店の設定
      </div>
      <div class="menu-description">
        入力時に表示する店名や相手の候補を編集します。
      </div>
    </div>

    <!-- タブUI -->
    <div class="tabs">
      <button class="button" :class="{ active: mode === 100 }" @click="mode = 100">資産</button>
      <button class="button" :class="{ active: mode === 200 }" @click="mode = 200">負債</button>
      <button class="button" :class="{ active: mode === 400 }" @click="mode = 400">収入</button>
      <button class="button" :class="{ active: mode === 500 }" @click="mode = 500">支出</button>
    </div>

    <!-- カード表示（大項目ごと） -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card"
    >
      <div class="card-header">
        <span class="category-icon">
          <component :is="getAccountIcon(category.daikoumoku)" :size="21" :stroke-width="2.2" />
        </span>
        <h3>{{ category.daikoumoku }}</h3>
        <span class="lock">🔒</span>
      </div>
      <div class="item-area">
        <div v-for="(item, index) in category.items" :key="index" class="item-list">

          <div class="item-row">
            <span class="item-code" :class="{ dirty: item.dirty }">{{ item.code }}</span>
            <span class="input-field" :class="{ dirty: item.dirty }">{{ item.shoukoumoku }}</span>
            <button class="toggle-btn" @click="toggle(item.code)"> {{ openedCode === item.code ? '－' : '＋' }}</button>
          </div>
          <div v-if="openedCode === item.code" class="shop-area">
            <div v-for="(shop, sIndex) in item.shops" :key="sIndex" class="shop-row">
              <input v-model="item.shops[sIndex]" placeholder="ショップ名" class="input-field"/>
            </div>
            <button class="btn" @click="update(item)">
              更新
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}


/* メニューカード */

.settings-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 86px;
  margin: 0;
  padding: var(--space-4);
  gap: var(--space-3);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition:
    background-color .16s ease,
    border-color .16s ease,
    transform .16s ease;
}

.settings-menu-item:hover {
  background: var(--color-surface-soft);
  border-color: var(--color-border-strong);
}

.settings-menu-item:active {
  transform: translateY(1px);
}


/* アイコン */

.menu-icon {
  display: flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
  color: var(--color-coffee);
}

.menu-icon svg {
  flex-shrink: 0;
}


/* メニュー文字 */

.menu-text {
  flex: 1 1 auto;
  min-width: 0;
}

.menu-title {
  margin-bottom: 4px;
  color: var(--color-text);
  font-size: 15px;
  font-weight: 750;
  line-height: 1.4;
}

.menu-description {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.5;
}

/* 大項目カード */
.card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border, #e1d5c9);
  border-radius: 14px;
  background: var(--color-surface, #fffdf9);
  box-shadow: 0 2px 8px rgb(75 53 38 / 5%);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border, #e1d5c9);
}

.card-header h3 {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--color-brown-dark, #49372d);
  font-size: 16px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.category-icon {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  color: var(--color-coffee);
}

.lock {
  opacity: 0.65;
  font-size: 14px;
}

.item-area,
.item-list,
.shop-area {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  margin-bottom: 2px;
}

.item-code {
  flex: 0 0 42px;
  display: inline-block;
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.item-code.dirty {
  background: #f8e2dc;
}

.dirty {
  color: #a34232;
}


@media (max-width: 420px) {
  .settings-wrapper {
    padding: 12px;
    gap: 14px;
  }

  .tabs {
    gap: 4px;
  }

  .tabs button {
    padding: 9px 3px;
    font-size: 13px;
  }

  .card {
    padding: 12px;
  }

  .shop-area {
    padding: 10px;
  }
}
</style>