<template>
  <v-dialog
    :value="value"
    content-class="fullscreen f-col"
  >
    <div class="login-dialog f-grow f-col f-justify-center dark">
      <div class="bg-logo-container">
        <img src="../assets/image_logo.svg">
      </div>
      <div class="content">
        <div class="card dark">
          <div class="login-header f-col-ac">
            <img class="logo my-2" src="../assets/login_text_logo.svg">
            <h1><translate>Sign In to Continue</translate></h1>
          </div>

          <div class="title pb-1">
            <p
              v-if="permissionDenied"
              class="text-center error p-2"
              key="permission"
            >
              <translate>Permission denied</translate>
            </p>

            <div v-if="!forgotPassword && tasks.login.error" class="error f-row f-justify-center m-2">
              <v-icon name="circle-error-outline" class="mr-2"/>
              <translate>Authentication failed</translate>
            </div>
            <div v-if="forgotPassword && tasks.passwordReset.error" class="error f-row f-justify-center m-2">
              <v-icon v-if="tasks.passwordReset.error" name="circle-error-outline" class="mr-2"/>
              <p v-text="tr.PasswordResetError"/>
            </div>
            <form v-if="forgotPassword" class="f-col" @submit.prevent>
              <div class="note f-row m-2">
                <!-- <v-icon v-if="tasks.passwordReset.error" name="circle-error-outline" class="mr-2"/> -->
                <template v-if="tasks.passwordReset.success">
                  <v-icon name="circle-check-outline" class="mr-2"/>
                  <p v-text="tr.PasswordResetSuccess"/>
                </template>
                <span v-else v-text="tr.PasswordResetInfo"/>
              </div>
              <v-text-field
                autofocus
                key="email"
                class="semi-flat"
                name="email"
                type="email"
                autocomplete="email"
                :label="tr.Email"
                v-model="email"
                @keydown.enter="resetPassword"
              />
              <v-btn
                key="reset-btn"
                color="primary"
                :disabled="!email || tasks.passwordReset.success"
                :loading="tasks.passwordReset.pending"
                @click="resetPassword"
              >
                <translate>Reset Password</translate>
              </v-btn>
            </form>
            <form v-else class="f-col">
              <v-text-field
                autofocus
                key="login"
                class="semi-flat"
                name="username"
                :label="tr.Login"
                v-model="username"
                @keydown.enter="login"
              />
              <v-text-field
                class="semi-flat"
                name="password"
                v-model="password"
                :label="tr.Password"
                :type="passwordVisible ? 'text' : 'password'"
                @keydown.enter="login"
              >
                <v-btn
                  slot="append"
                  tabindex="-1"
                  class="small icon flat"
                  color="#fff"
                  @click="passwordVisible = !passwordVisible"
                >
                  <v-icon :name="passwordVisible ? 'visibility_off' : 'visibility'"/>
                </v-btn>
              </v-text-field>
              <v-btn
                color="primary"
                :loading="tasks.login.pending"
                @click="login"
              >
                <translate>Login</translate>
              </v-btn>
            </form>
          </div>
          <div class="f-row-ac footer">
            <v-btn
              v-if="!loginRequired"
              @click="$emit('close')"
            >
              <translate>Continue as Guest</translate>
            </v-btn>
            <div class="f-grow"/>
            <v-btn
              v-if="passwordResetUrl"
              @click="forgotPassword = !forgotPassword"
            >
              <translate v-if="forgotPassword">Back to Login</translate>
              <translate v-else key="forgot">Forgot password?</translate>
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import { TaskState, watchTask } from '@/tasks'

// chrome autofill behaviour can be troublemaker:
// https://bugs.chromium.org/p/chromium/issues/detail?id=669724
export default {
  name: 'LoginDialog',
  props: {
    value: Boolean,
    loginRequired: Boolean,
    permissionDenied: Boolean,
    passwordResetUrl: String
  },
  data () {
    return {
      username: '',
      password: '',
      email: '',
      passwordVisible: false,
      forgotPassword: false,
      tasks: {
        login: TaskState(),
        passwordReset: TaskState()
      }
    }
  },
  computed: {
    tr () {
      return {
        Login: this.$gettext('Username / Email'),
        Password: this.$gettext('Password'),
        Email: this.$gettext('Email'),
        PasswordResetInfo: this.$gettext(
          'Enter your email address below and we will email instructions for setting a new password.'
        ),
        PasswordResetError: this.$gettext('Failed to process your request.'),
        PasswordResetSuccess: this.$gettext('Email was sent to given email address.')
      }
    }
  },
  methods: {
    async login () {
      const task = this.$http.login(this.username, this.password)
      const resp = await watchTask(task, this.tasks.login)
      if (this.tasks.login.success) {
        this.$emit('login', resp.data)
      }
    },
    resetPassword1 () {
      this.$http.post(this.passwordResetUrl, { email: this.email })
        .then(() => {
          this.passwordResetSuccess = true
          this.passwordResetError = false
        })
        .catch(err => {
          this.passwordResetError = true
          this.passwordResetSuccess = false
          if (err.response && err.response.data.email) {
            this.errors = err.response.data
          }
        })
    },
    resetPassword () {
      const task = this.$http.post(this.passwordResetUrl, { email: this.email })
      watchTask(task, this.tasks.passwordReset)
    }
  }
}
</script>

<style lang="scss" scoped>
.login-dialog {
  background-color: black;
}
.login-header {
  .logo {
    width: 80%;
  }
  h1 {
    font-size: 24px;
    font-weight: 500;
    margin: 16px 6px;
  }
}
.content {
  width: 80%;
  margin: 16px auto;
  .card {
    max-width: 400px;
  }
  @media (max-width: 800px) {
    width: unset;
    margin: 8px;
    align-self: center;
  }
}
.error {
  color: var(--color-red);
  --icon-color: var(--color-red);
}
form {
  border: 2px dashed #444;
  padding: 8px;
  --fill-color: rgb(10,10,10);
  ::v-deep {
    // input:-webkit-autofill {
    //   -webkit-box-shadow: 0 0 0px 1000px #000 inset;
    //   -webkit-text-fill-color: #fff;
    // }

    // transparent autofill
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      transition-delay: 9999s;
    }
  }
  .i-field {
    --border-color: rgba(250, 250, 250, 0.25);
    ::v-deep .input {
      height: 36px;
    }
  }
  .note {
    opacity: 0.9;
    min-height: 44px;
  }
}
.footer {
  .btn:not(.icon) {
    text-transform: none;
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
</style>
