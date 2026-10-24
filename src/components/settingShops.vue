<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { GAS_URL } from '@/constants/index.js'
  import loadingStore from "@/stores/loadingStore"

  /* GASから取得した生データ */
  const rawList = ref([])

  /* モード：100=資産, 200=負債, 400=収入, 500=支出 */
  const mode = ref(500)

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

  const openedCode = ref(null)
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

    <!-- タブUI -->
    <div class="tabs">
      <button :class="{ active: mode === 100 }" @click="mode = 100">資産</button>
      <button :class="{ active: mode === 200 }" @click="mode = 200">負債</button>
      <button :class="{ active: mode === 400 }" @click="mode = 400">収入</button>
      <button :class="{ active: mode === 500 }" @click="mode = 500">支出</button>
    </div>

    <!-- カード表示（大項目ごと） -->
    <div
      v-for="category in categories"
      :key="category.daikoumoku"
      class="card"
    >
      <div class="card-header">
        <h3>{{ category.daikoumoku }}</h3>
        <span class="lock">🔒</span>
      </div>
      <div class="item-area">
        <div v-for="(item, index) in category.items" :key="index" class="item-list">

          <div class="item-row">
            <span class="item-code" :class="{ dirty: item.dirty }">{{ item.code }}</span>
            <span class="item-input" :class="{ dirty: item.dirty }">{{ item.shoukoumoku }}</span>
            <button class="toggle-btn" @click="toggle(item.code)">＋</button>
          </div>
          <div v-if="openedCode === item.code" class="shop-area">
            <div v-for="(shop, sIndex) in item.shops" :key="sIndex" class="shop-row">
              <input v-model="item.shops[sIndex]" placeholder="ショップ名" />
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
.settings-wrapper {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-sizing: border-box;
  color: var(--color-brown-dark, #49372d);
}

/* 資産・負債・収入・支出タブ */
.tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
}

.tabs button {
  min-width: 0;
  padding: 10px 6px;
  border: 1px solid var(--color-border, #d8c8b9);
  border-radius: 10px;
  background: var(--color-surface, #fffdf9);
  color: var(--color-coffee, #6b4f3f);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tabs button.active {
  background: var(--color-coffee, #6b4f3f);
  border-color: var(--color-coffee, #6b4f3f);
  color: #fff;
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
  flex: 0 0 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 4px;
  box-sizing: border-box;
  border-radius: 7px;
  background: var(--color-beige, #f2e8dc);
  color: var(--color-coffee, #6b4f3f);
  font-size: 13px;
  text-align: center;
}

.item-code.dirty {
  background: #f8e2dc;
}

.item-input {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  color: var(--color-brown-dark, #49372d);
  font-size: 14px;
  overflow-wrap: anywhere;
}

.dirty {
  color: #a34232;
}

.toggle-btn {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border, #d8c8b9);
  border-radius: 9px;
  background: var(--color-beige, #f2e8dc);
  color: var(--color-coffee, #6b4f3f);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.shop-area {
  margin: 2px 0 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #e1d5c9);
  border-radius: 12px;
  background: var(--color-background, #faf6f0);
  box-sizing: border-box;
}

.shop-row {
  display: flex;
  width: 100%;
  margin: 0;
  gap: 8px;
}

.shop-row input {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  margin: 0;
  padding: 9px 11px;
  box-sizing: border-box;
  border: 1px solid var(--color-border, #d8c8b9);
  border-radius: 9px;
  background: var(--color-surface, #fffdf9);
  color: var(--color-brown-dark, #49372d);
  font: inherit;
}

.shop-row input:focus {
  outline: 2px solid var(--color-coffee, #6b4f3f);
  outline-offset: 1px;
}

.btn {
  align-self: flex-end;
  min-width: 88px;
  min-height: 40px;
  padding: 9px 18px;
  border: 0;
  border-radius: 9px;
  background: var(--color-coffee, #6b4f3f);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn:active,
.toggle-btn:active,
.tabs button:active {
  transform: translateY(1px);
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