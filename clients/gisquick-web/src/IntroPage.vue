<template>
  <div class="page f-grow">
    <div class="header f-col-ac f-justify-center px-2 shadow-2">
      <img src="./assets/login_text_logo.svg" class="logo my-4">
    </div>
    <div v-if="userSignedIn" class="dashboard f-col f-grow">
      <user-dashboard/>
    </div>
    <template v-else>
      <div class="main f-col-ac f-justify-center light">
        <translate class="my-2">
          You will need to enter URL of existing project to see a map!
        </translate>
        <img src="@/assets/map.svg" class="image my-2"/>
      </div>
      <div class="footer f-col-ac light">
        <div class="sign-info">
          <div class="section f-col mx-2 my-4">
            <translate class="text--secondary mb-4">
              Already registered? You can continue with Sign In to see list of your projects
            </translate>
            <v-btn color="#444" @click="showLogin">
              <translate>Sign in</translate>
            </v-btn>
          </div>
          <div class="divider"/>
          <div class="section f-col mx-2 my-4">
            <translate class="text--secondary mb-4">
              New to Gisquick? Create a new account if you want to publish your own maps!
            </translate>
            <v-btn color="primary" href="/accounts/signup/">
              <translate>Sign up</translate>
            </v-btn>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import UserDashboard from '@/UserDashboard.vue'

export default {
  components: { UserDashboard },
  computed: {
    ...mapState(['app', 'user']),
    userSignedIn () {
      return this.user && !this.user.is_guest
    }
  },
  methods: {
    showLogin () {
      this.$store.commit('showLogin', true)
    },
    onLogin (user) {
      this.$store.commit('user', user)
      this.$store.commit('showLogin', false)
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
  /* possible fixes for issue with filling height (1fr) in chrome inside flexbox with flex-grow:1 */
  min-height: inherit;
  // min-height: 100vh;
  // height: 1px;
  // height: 100vh;

  text-align: center;
  // display: grid;
  // grid-template-rows: 120px 1fr auto;

  display: flex;
  flex-direction: column;
  background-color: #eee;

  .header {
    background-color: #505050;
    background-color: #333;
    height: 120px;
  }
  .main {
    max-width: 960px;
    justify-self: center; // grid
    align-self: center; // flexbox (column)

    font-size: 20px;
    padding: 12px;
    flex-grow: 1;
    flex-basis: 0;
  }
  .dashboard {
    background-color: rgba(var(--color-primary-rgb), 0.25);
  }
  .user-dashboard {
    width: 100%;
    max-width: 960px;
    justify-self: center; // grid
    align-self: center; // flexbox (column)
    background-color: #fff;
    @media (min-width: 960px) {
      margin-top: 12px;
      margin-bottom: 12px;
    }
  }
  .footer {
    background-color: #ddd;
    padding: 12px;
  }
  .sign-info {
    min-width: 0;
    width: auto;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    .divider {
      background-color: #ccc;
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
