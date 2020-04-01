<template>
  <div class="page">
    <div class="header layout column align-center justify-center px-2">
      <img src="./assets/login_text_logo.svg" class="logo my-4">
    </div>
    <user-dashboard
      v-if="userSignedIn"
      class="elevation-3"
    />
    <template v-else>
      <div class="main">
        <p class="my-3">
          You will need to enter URL of existing project to see a map!
        </p>
        <img src="@/assets/map.svg" class="image my-3"/>
      </div>
      <div class="grey lighten-3 layout align-center column">
        <div class="sign-info">
          <v-layout class="column section mx-2 my-4">
            <p class="text--secondary">
              Already registred? You can continue with Sign In to see list of your projects
            </p>
            <v-btn color="secondary" @click="showLogin=true">Sign in</v-btn>
          </v-layout>
          <div class="divider"/>
          <v-layout class="column section mx-2 my-4">
            <p class="text--secondary">
              New to Gisquick? Create a new account if you want to publish your own maps!
            </p>
            <v-btn color="primary" href="/accounts/signup/">Sign up</v-btn>
          </v-layout>
        </div>
      </div>
    </template>
    <login-dialog
      :value="showLogin"
      :password-reset-url="app.reset_password_url"
      @login="onLogin"
      @close="showLogin = false"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import LoginDialog from '@/components/LoginDialog.vue'
import UserDashboard from './UserDashboard.vue'

export default {
  components: { LoginDialog, UserDashboard },
  data () {
    return {
      showLogin: false
    }
  },
  computed: {
    ...mapState(['app', 'user']),
    userSignedIn () {
      return this.user && !this.user.is_guest
    }
  },
  methods: {
    onLogin (user) {
      this.$store.commit('user', user)
      this.showLogin = false
    }
  }
}
</script>

<style lang="scss" scoped>
.logo {
  min-height: 0;
  max-height: 60px;
  max-width: 95%;
  width: auto;
  object-fit: contain;
}
.page {
  min-height: 100%;
  text-align: center;
  display: grid;
  grid-template-rows: minmax(15%, auto) 1fr auto;
  .header {
    background-color: #505050;
  }
  .main {
    align-self: center;
    font-size: 20px;
    p {
      color: #333;
    }
  }
  .user-dashboard {
    width: 100%;
    max-width: 860px;
    justify-self: center;
    @media (min-width: 860px) {
      margin-top: 12px;
      margin-bottom: 12px;
    }
  }
  .sign-info {
    min-width: 0;
    width: auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    .divider {
      background-color: #ddd;
      width: 1px;
      margin: 24px 4px;
    }
    @media (max-width: 500px) {
      grid-template-columns: 1fr;
      .divider {
        width: auto;
        height: 1px;
        margin: 4px 0;
      }
    }
    .section {
      max-width: 300px;
      text-align: center;
      justify-content: space-between;
    }
    .v-btn {
      min-width: 150px;
      margin: 4px 0;
      align-self: center;
      justify-self: end;
    }
  }
}
</style>
