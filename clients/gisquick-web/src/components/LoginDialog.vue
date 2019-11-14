<template>
  <v-dialog
    fullscreen scrollable
    :value="value"
    content-class="login-dialog"
  >
    <div class="bg-logo-container">
      <img src="../assets/image_logo.svg">
    </div>
    <v-container>
      <v-card dark color="transparent">
        <v-layout column class="header">
          <img class="logo" src="../assets/login_text_logo.svg">
          <!-- <h4>You're entering project</h4> -->
          <!-- <h3>Project</h3> -->
          <h3><translate>Sign In to Continue</translate></h3>
        </v-layout>

        <v-card-text class="pb-1">
          <p
            v-if="permissionDenied"
            class="text-xs-center red--text"
            key="permission"
          >
            <translate>Permission denied</translate>
          </p>
          <p
            v-if="authenticationError"
            class="text-xs-center red--text"
            key="error"
          >
            {{ authenticationError }}
          </p>
          <v-form ref="form" v-model="valid" :lazy-validation="true">
            <v-text-field
              v-model="username"
              :label="tr.Username"
              placeholder=" "
              @keyup.enter="login"
            />
            <v-text-field
              v-model="password"
              :label="tr.Password"
              placeholder=" "
              :append-icon="passwordVisible ? 'visibility_off' : 'visibility'"
              @click:append="passwordVisible = !passwordVisible"
              :type="passwordVisible ? 'text' : 'password'"
              @keyup.enter="login"
            />
            <v-btn
              light
              color="grey lighten-3"
              class="mx-0"
              @click="login"
            >
              <translate>Login</translate>
            </v-btn>
          </v-form>
        </v-card-text>
        <v-layout class="row footer mx-3">
          <v-btn
            v-if="!loginRequired"
            @click="$emit('close')"
            color="grey"
            flat
          >
            <translate>Continue as Guest</translate>
          </v-btn>
          <v-spacer/>
          <v-btn
            v-if="passwordReset"
            :href="passwordReset"
            color="grey"
            flat
          >
            <translate>Forgot password?</translate>
          </v-btn>
        </v-layout>
      </v-card>
    </v-container>
  </v-dialog>
</template>

<script>

export default {
  name: 'login-dialog',
  props: {
    value: Boolean,
    loginRequired: Boolean,
    permissionDenied: Boolean,
    passwordReset: String
  },
  data () {
    return {
      authenticationError: '',
      valid: true,
      username: '',
      password: '',
      passwordVisible: false
    }
  },
  computed: {
    tr () {
      return {
        Username: this.$gettext('Username'),
        Password: this.$gettext('Password')
      }
    }
  },
  methods: {
    login () {
      // if (this.$refs.form.validate()) {
      this.$http.login(this.username, this.password)
        .then(resp => {
          this.authenticationError = null
          this.$emit('login', resp.data)
        })
        .catch(resp => {
          this.authenticationError = this.$gettext('Authentication failed')
        })
      // }
    }
  }
}
</script>

<style lang="scss" scoped>
/deep/ .login-dialog {
  background-color: black;
  .v-card {
    max-width: 400px;

    .header {
      justify-content: center;
      align-items: center;
      .logo {
        width: 80%;
        margin-bottom: 1em;
      }
      h3, h4 {
        margin: 0.5em 0;
        font-weight: 400;
      }
      h4 {
        opacity: 0.5;
      }
    }

    form {
      border: 2px dashed #444;
      padding: 0.5em 1em;
      display: flex;
      flex-direction: column;
      .input-group label:after {
        /* Remove asterics from required fields */
        display: none;
      }
      .btn {
        margin: 0.25em 0;
      }
      input:-webkit-autofill {
        -webkit-box-shadow: 0 0 0px 1000px #000 inset;
        -webkit-text-fill-color: #fff
      }
    }
    .footer {
      .v-btn {
        text-transform: none;
      }
    }
  }

  .bg-logo-container {
    position: absolute;
    overflow: hidden;
    top: 0;
    bottom: 0;
    left: calc(400px + (100% - 400px)/ 2);
    width: calc((100% - 400px)/ 2);
    img {
      position: absolute;
      height: 100%;
      left: 40%;
      top: 0;
    }
  }
}
</style>
