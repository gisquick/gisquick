<template>
  <div class="user-dashboard f-col">
    <div class="header f-row-ac shadow-1">
      <translate class="headline mr-2">Projects</translate>
      <div class="f-grow"/>
      <div class="user-card f-col f-justify-end f-shrink">
        <div class="f-row f-justify-end">
          <div class="username f-col f-justify-center f-align-end f-grow mx-1">
            <div>{{ user.username }}</div>
            <div
              v-if="user.username !== user.full_name"
              v-text="user.full_name"
            />
          </div>
          <v-icon name="account_circle" size="28" class="m-2"/>
        </div>
        <hr/>
        <div class="f-row-ac">
          <v-btn href="/user/" class="icon flat">
            <v-icon name="settings" size="22"/>
          </v-btn>
          <v-btn
            color="#444"
            class="round medium"
            @click="logout"
          >
            <v-icon name="exit_to_app" class="mr-2"/>
            <translate>Sign out</translate>
          </v-btn>
        </div>
      </div>
    </div>
    <!-- <hr/> -->

    <div class="content f-col f-grow light">
      <v-spinner
        v-if="loadingProjects"
        class="my-4 mx-auto"
      />
      <div
        v-else-if="projects.length > 0"
        class="list f-col f-grow"
      >
        <a
          v-for="project in projects"
          :key="project.project"
          :href="`?PROJECT=${project.project}`"
          class="item f-col f-align-start f-justify-center"
        >
          <div class="title" v-text="project.title"/>
          <small
            class="text--secondary"
            v-text="project.publication_time"
          />
          <v-icon
            v-if="project.authentication === 'owner'"
            class="auth m-2"
            name="lock"
          />
        </a>
      </div>
      <div v-else class="empty f-col-ac">
        <translate class="py-4 title">You didn't publish any project yet!</translate>
        <translate tag="p" class="my-4">
          Use QGIS and Gisquick plugin to create your map, and then publish it from your profile page.
        </translate>
        <v-btn
          href="/user/publish/"
          class="inline round"
          color="primary"
        >
          <v-icon name="qgis" class="mr-2"/>
          <translate>Publish project</translate>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  components: { },
  data () {
    return {
      loadingProjects: false,
      projects: []
    }
  },
  computed: {
    ...mapState(['app', 'user'])
  },
  mounted () {
    this.fetchProjects()
  },
  methods: {
    logout () {
      this.$http.logout().then(() => location.reload())
    },
    async fetchProjects () {
      this.loadingProjects = true
      try {
        const { data } = await this.$http.get('/api/projects/')
        this.projects = data.projects
      } finally {
        this.loadingProjects = false
      }
    },
    openProject (project) {
      location.search = `PROJECT=${project.project}`
    }
  }
}
</script>

<style lang="scss" scoped>
.header {
  background-color: #d2d2d2;
  border: 1px solid #999;
  color: #333;
  --border-color: #999;
  --icon-color: #444;
  padding: 6px 10px;
  .headline {
    font-size: 22px;
    font-weight: 500;
  }
}
.content {
  border: solid #aaa;
  border-width: 0 1px 1px 1px;
  .btn {
    // max-width: 200px;
    align-self: center;
    justify-self: center;
    &.inline {
      // display: inline-flex;
      // height: 24px;
      // margin: 0 6px;
    }
  }
}
.list {
  .item {
    height: 64px;
    padding: 10px;
    border-bottom: 1px solid #ddd;
    color: inherit;
    text-decoration: none;
    position: relative;
    &:hover {
      background-color: #eee;
    }
    .title {
      font-weight: 500;
    }
    .text--secondary {
      opacity: 0.7;
    }
    .auth {
      position: absolute;
      right: 6px;
    }
  }
}
p {
  max-width: 400px;
}
.btn.medium {
  height: 30px;
  max-height: 30px;
  font-size: 14px;
}
.empty {
  padding: 24px 12px;
  .title {
    font-size: 20px;
    font-weight: 500;
  }
}
</style>
