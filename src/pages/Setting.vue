
<template>
  <main class="settings-page">

    <!-- タイトル -->
    <h1 class="settings-title">
      <Settings :size="25" :stroke-width="2.2" />
      <span>設定</span>
    </h1>

    <p class="settings-description">
      家計簿アプリの各種設定を変更できます。
    </p>

    <!-- 設定メニュー -->
    <section class="settings-menu">

      <!-- 科目設定 -->
      <button
        type="button"
        class="card settings-menu-item"
        @click="goCategories"
      >
        <div class="menu-icon">
          <Tags :size="24" />
        </div>

        <div class="menu-text">
          <div class="menu-title">
            口座・科目の設定
          </div>
          <div class="menu-description">
            資産・負債・収入・支出の科目や小項目を編集します。
          </div>
        </div>

        <ChevronRight class="menu-arrow" :size="22" />
      </button>

      <!-- お店設定 -->
      <button
        type="button"
        class="card settings-menu-item"
        @click="goShops"
      >
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

        <ChevronRight class="menu-arrow" :size="22" />
      </button>

      <!-- 定期収支設定 -->
      <button
        type="button"
        class="card settings-menu-item"
        @click="goMonthlys"
      >
        <div class="menu-icon">
          <CalendarClock :size="24" />
        </div>

        <div class="menu-text">
          <div class="menu-title">
            定期収支設定
          </div>
          <div class="menu-description">
            毎月・指定月に発生する収入や支出を設定します。
          </div>
        </div>

        <ChevronRight class="menu-arrow" :size="22" />
      </button>

    </section>

  </main>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import {
  Settings,
  Tags,
  Store,
  CalendarClock,
  ChevronRight
} from "lucide-vue-next";

import loadingStore from "@/stores/loadingStore";

const router = useRouter();


// 科目設定
const goCategories = () => {
  router.push("/setting/kamoku");
};


// お店設定
const goShops = () => {
  router.push("/setting/shops");
};


// 定期収支設定
const goMonthlys = () => {
  router.push("/setting/monthly");
};


// 初期ローディング解除
onMounted(() => {
  loadingStore.globalLoading.value = false;
});
</script>

<style scoped>
/* =====================================
   設定トップ画面
===================================== */

.settings-page {
  width: 100%;
  max-width: var(--content-width);
  min-width: 0;
  margin: 0 auto;
  padding-bottom: var(--space-4);
}


/* タイトル */

.settings-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.settings-title svg {
  flex: 0 0 auto;
  color: var(--color-coffee);
}


/* 説明 */

.settings-description {
  margin: 0 0 var(--space-5);
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.6;
}


/* メニュー一覧 */

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


/* 右矢印 */

.menu-arrow {
  flex: 0 0 auto;
  color: var(--color-muted);
}


/* スマートフォン */

@media (max-width: 420px) {
  .settings-menu-item {
    min-height: 82px;
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .menu-icon {
    flex-basis: 42px;
    width: 42px;
    height: 42px;
  }

  .menu-title {
    font-size: 14px;
  }

  .menu-description {
    font-size: 11px;
  }
}
</style>
