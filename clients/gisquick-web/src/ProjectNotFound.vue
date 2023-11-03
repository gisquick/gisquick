<template>
  <div class="page f-col-ac light">
    <div class="f-grow"/>
    <img src="@/assets/text_logo.svg?url" class="logo my-4"/>
    <h1 class="">Map Not Found!</h1>
    <img src="@/assets/map_not_exist.svg?url" class="image my-4"/>
    <div class="f-grow"/>
    <div class="f-grow"/>
  </div>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  overflow: auto;
  padding: 16px;
  text-align: center;
  gap: 16px;
}
.logo {
  flex: 0 1 50px;
  max-width: 100%;
  min-height: 10px;
  object-fit: contain;
}
.image {
  height: 180px;
}
h1 {
  font-size: clamp(22px, 3vw, 32px);
}
</style>
