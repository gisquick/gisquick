<template>
  <v-dialog title="Notifications" :value="!!notification" persistent>
    <div v-if="notification" class="notification f-col">
      <span class="title p-2" v-text="notification.title"/>
      <hr/>
      <div class="content p-2" v-html="notification.msg"/>
      <hr/>
      <div class="f-row-ac">
        <v-checkbox :label="tr.DoNotShowAgain" v-model="dontShowAgain"/>
        <span class="f-grow"/>
        <v-btn
          color="primary"
          class="small"
          @click="confirmNotification"
        >
          <translate v-if="notificationIndex < notifications.length - 1" key="next" translate-context="adverb">Next</translate>
          <translate v-else key="close">Close</translate>
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<script lang="js">
import { mapState } from 'vuex'
import { set, get } from 'idb-keyval'

export default {
  props: {
    notifications: Array
  },
  data () {
    return {
      notificationIndex: 0,
      dontShowAgain: false,
      confirmedNotifications: null
    }
  },
  computed: {
    ...mapState(['user']),
    activeNotifications () {
      if (this.confirmedNotifications) {
        const notifications = this.notifications ?? []
        const userConfirmedNotifications = this.confirmedNotifications
          .map(key => key.split(':'))
          .filter(info => info[0] === this.user.username)
          .map(info => info[1])
        return notifications.filter(n => !userConfirmedNotifications.includes(n.id))
      }
      return []
    },
    notification () {
      return this.activeNotifications[this.notificationIndex]
    },
    tr () {
      return {
        DoNotShowAgain: this.$gettext("Don't show this message again")
      }
    }
  },
  watch: {
    user: {
      immediate: true,
      async handler (user) {
        /*
        // with expiration of confirmed notifications
        const confirmedNotifications = await get('confirmed-notifications') || []
        const day = 24 * 60 * 60 // in seconds
        const limit = (new Date().getTime() / 1000) - 30 * day
        this.confirmedNotifications = confirmedNotifications.filter(key => parseInt(key.split(':')?.[2]) > limit)
        */
        this.confirmedNotifications = await get('confirmed-notifications') || []
        this.notificationIndex = 0
      }
    }
  },
  methods: {
    async confirmNotification () {
      if (this.dontShowAgain) {
        // with expiration of confirmed notifications
        // const confirmedAt = parseInt(new Date().getTime() / 1000)
        // const confirmed = [`${this.user.username}:${this.notification.id}:${confirmedAt}`, ...this.confirmedNotifications]

        const confirmed = [...this.confirmedNotifications, `${this.user.username}:${this.notification.id}`]
        set('confirmed-notifications', confirmed)
        this.dontShowAgain = false
      }
      this.notificationIndex++
    }
  }
}
</script>

<style lang="scss" scoped>
.notification {
  min-width: 300px;
  .title {
    font-weight: 500;
    font-size: 16px;
    line-height: 1.25;
    // background-color: #ddd;
    background-color: #333;
    // background-color: var(--color-primary);
    color: #fff;
  }
  --border-color: #e2e2e2;
  // ::v-deep a {
  //   color: var(--color-primary);
  //   text-decoration: none;
  // }
}
</style>
