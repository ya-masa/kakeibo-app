<template>
  <nav class="app-links">
    <ul>
      <li><router-link to="/">一覧</router-link></li>
      <li><router-link to="/add">新規入力</router-link></li>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'AppLinks'
}
</script>

<style scoped>
.app-links {
  margin: 1rem 0;
}

.app-links ul {
  list-style: none;
  padding: 20px;
  display: flex;
  gap: 1rem;
}

.app-links a {
  display: inline-block;
  padding: 8px 16px;
  background: #c2a284;
  color:#fff;
  border-radius: 8px;      /* 角丸 */
  text-decoration:none;
  transition: 0.2s;

}
.btn-link:hover {
  background: #c2a284;        /* ほんのり明るく */
}

.btn-link:active {
  background: #000;        /* 押した感 */
}

.app-links a.router-link-active {
  text-decoration: underline;
}
</style>
