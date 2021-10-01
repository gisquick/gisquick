<template>
  <div class="error-page light f-col-ac">
    <div class="f-grow"/>
    <img src="@/assets/text_logo.svg" class="logo"/>
    <h1>Server Error!</h1>
    <img src="@/assets/server_error.svg" class="image"/>
    <div class="f-grow"/>
    <div class="f-grow"/>
  </div>
</template>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  h1 {
    color: var(--color-red);
  }
  .logo {
    height: 50px;
    width: auto;
    margin: 12px 0;
  }
  .image {
    height: 180px;
    margin: 12px 0;
  }
}
</style>
