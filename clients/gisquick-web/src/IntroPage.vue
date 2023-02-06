<template>
  <div class="page f-grow">
    <template v-if="!userSignedIn">
      <div class="header f-col-ac f-justify-center px-2 shadow-2">
        <!-- <img src="./assets/text_logo_dark.svg" class="logo my-4"/> -->
        <svg-logo class="logo my-4"/>
      </div>
      <div class="main f-col-ac f-justify-center light">
        <translate tag="h1" class="my-4"> Welcome to the Gisquick </translate>
        <translate tag="h2" class="my-4">
          Web platform for publishing your maps from QGIS desktop
        </translate>
        <!-- <img src="@/assets/map.svg" class="image my-2"/> -->
        <svg-map class="map-img my-2" height="220"/>
      </div>
      <div class="footer f-col-ac light">
        <div class="sign-info">
          <div class="section f-col mx-2 my-4">
            <translate class="text--secondary mb-4">
              Already registered? You can continue with Sign In to see list of
              your projects
            </translate>
            <v-btn color="#444" @click="showLogin">
              <translate>Sign in</translate>
            </v-btn>
          </div>
          <div class="divider"/>
          <div class="section f-col mx-2 my-4">
            <translate class="text--secondary mb-4">
              New to Gisquick? Create a new account if you want to publish your
              own maps!
            </translate>
            <v-btn color="primary" href="/accounts/signup/">
              <translate>Sign up</translate>
            </v-btn>
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="showUserProjects">
      <div class="header-small f-col-ac f-justify-center p-2 shadow-2">
        <svg-logo class="my-2" height="32"/>
      </div>
      <user-dashboard class="f-col f-grow"/>
    </template>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import UserDashboard from '@/UserDashboard.vue'
import SvgLogo from '@/assets/text_logo_dark.svg?inline'
import SvgMap from '@/assets/map.svg?inline'

export default {
  components: { UserDashboard, SvgLogo, SvgMap },
  computed: {
    ...mapState(['app', 'user']),
    userSignedIn () {
      return this.user && !this.user.is_guest
    },
    showUserProjects () {
      return true
      // return this.userSignedIn && (process.env.NODE_ENV === 'development' || window.env.mobile)
    }
  },
  watch: {
    // userSignedIn: {
    //   immediate: true,
    //   handler (userSignedIn) {
    //     if (userSignedIn && process.env.NODE_ENV !== 'development' && !window.env.mobile) {
    //       this.redirectToUserProfile()
    //     }
    //   }
    // }
  },
  methods: {
    // redirectToUserProfile () {
    //   window.location.replace(`${location.origin}/user/`)
    // },
    showLogin () {
      this.$store.commit('showLogin', true)
    }
  }
}
</script>

<style lang="scss" scoped>
.logo {
  min-height: 0;
  max-height: 52px;
  max-width: 95%;
  width: auto;
  object-fit: contain;
}
.page {
  min-height: calc(var(--vh, 1vh) * 100);
  text-align: center;
  // display: grid;
  // grid-template-rows: 120px 1fr auto;

  display: flex;
  flex-direction: column;
  background-color: #eee;
  overflow: auto;

  h1 {
    font-weight: 500;
    font-size: 38px;
  }
  h2 {
    font-weight: normal;
    font-size: 25px;
  }
  .header {
    background-color: var(--color-dark);
    height: 120px;
  }
  .header-small {
    background-color: var(--color-dark);
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
  @media (max-width: 600px) {
    h1 {
      font-size: 28px;
    }
    h2 {
      font-size: 20px;
    }
    .header {
      height: 72px;
    }
    .logo {
      max-height: 36px;
    }
    .map-img {
      height: 200px;
    }
  }
}
</style>
