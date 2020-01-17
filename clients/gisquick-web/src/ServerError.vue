<template>
  <v-app>
    <v-layout class="column fill-height align-center py-3">
      <v-spacer/>
      <img src="@/assets/text_logo.svg" class="logo my-3"/>
      <h1 class="red--text text--darken-1">Server Error!</h1>
      <img src="@/assets/server_error.svg" class="image my-3"/>
      <v-spacer/>
      <v-spacer/>
    </v-layout>
  </v-app>
</template>

<style lang="scss">
.logo {
  height: 50px;
  width: auto;
}
.image {
  height: 180px;
}
</style>
