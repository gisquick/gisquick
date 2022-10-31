<template>
  <div class="user-dashboard f-col">
    <div class="header f-row-ac shadow-1">
      <div class="f-col mr-2 light">
        <translate class="headline mx-2">Projects</translate>
        <v-text-field class="filled" placeholder="Search" v-model="filter">
          <template v-slot:append>
            <v-icon name="magnifier" class="mx-2"/>
          </template>
        </v-text-field>
      </div>
      <div class="f-grow"/>
      <div class="user-card f-col f-justify-end f-shrink">
        <div class="f-row f-justify-end">
          <div class="username f-col f-justify-center f-align-end f-grow mx-1">
            <div v-text="user.username"/>
            <div
              v-if="user.username !== user.full_name"
              v-text="user.full_name"
            />
          </div>
          <v-icon name="account" size="25" class="m-2 mt-0"/>
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
        v-else-if="sortedProjects.length > 0"
        class="projects-list f-col py-2"
      >
        <div
          v-for="p in sortedProjects"
          :key="p.name"
          class="card"
        >
          <a class="map-link" :href="`/?PROJECT=${p.name}`">
            <img v-if="p.thumbnail" :src="`/api/project/thumbnail/${p.name}`"/>
            <map-img v-else/>
          </a>
          <a :href="`/?PROJECT=${p.name}`" class="project-link f-col px-2">
            <span v-text="p.title" class="title"/>
            <span v-text="p.name" class="name"/>
          </a>
          <div class="details f-row-ac">
            <div class="projection badge">{{ p.projection }}</div>
          </div>
          <div class="time-info f-col">
            <div>Created: <span :title="p.created.datetime" v-text="p.created.date"/></div>
            <div>Updated: <span :title="p.updated.datetime" v-text="p.updated.date"/></div>
          </div>
          <div class="badge auth dark">
            <span class="uppercase" v-text="p.authentication"/>
            <v-icon v-if="p.authentication !== 'public'" name="lock" size="16"/>
          </div>
        </div>
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
import orderBy from 'lodash/orderBy'
import MapImg from '@/assets/map.svg?inline'
import { sanitize, escapeRegExp, removeDiacritics } from '@/ui/utils/text'

function toDate (v) {
  return typeof v === 'string' ? new Date(v) : v
}
const df = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const dtf = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' })
const tf = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' })

const dateFormatters = {
  datetime: v => v && dtf.format(toDate(v)),
  date: v => v && df.format(toDate(v)),
  time: v => v && tf.format(toDate(v))
}
function oldApiProjects (data) {
  return data.projects.map(({ project, publication_time, ...rest }) => ({
    name: project,
    created: publication_time,
    ...rest
  }))
}

export default {
  components: { MapImg },
  data () {
    return {
      loadingProjects: false,
      projects: [],
      filter: ''
    }
  },
  computed: {
    ...mapState(['app', 'user']),
    formattedProjects () {
      return this.projects.map(({ created, last_update, ...data }) => ({
        ...data,
        created: this.formatDate(created),
        updated: this.formatDate(last_update)
      }))
    },
    sortedProjects () {
      let projects = this.formattedProjects
      if (this.filter) {
        const regex = new RegExp(escapeRegExp(sanitize(removeDiacritics(this.filter))), 'i')
        projects = projects.filter(p => regex.test(removeDiacritics(p.title)) || regex.test(removeDiacritics(p.name)))
      }
      if (this.sortBy) {
        return orderBy(projects, this.sortBy || 'title', this.sortDir)
      }
      return orderBy(projects, 'title', 'asc')
    },
  },
  mounted () {
    this.fetchProjects()
  },
  methods: {
    formatDate (d) {
      return {
        raw: d,
        date: dateFormatters.date(d),
        datetime: dateFormatters.datetime(d)
      }
    },
    logout () {
      this.$http.logout().then(() => location.reload())
    },
    async fetchProjects () {
      this.loadingProjects = true
      try {
        const { data } = await this.$http.get('/api/projects/')
        this.projects = Array.isArray(data) ? data : oldApiProjects(data) // compatibility with old API
      } finally {
        this.loadingProjects = false
      }
    },
    openProject (project) {
      location.search = `PROJECT=${project.name}`
    }
  }
}
</script>

<style lang="scss" scoped>
.header {
  background-color: #ddd;
  // background-color: rgba(var(--color-primary-rgb), 0.23);
  border: 1px solid #bbb;
  color: #333;
  --border-color: #999;
  --icon-color: #444;
  padding: 6px 8px 4px 2px;
  text-align: left;
  .headline {
    font-size: 20px;
    font-weight: 500;
  }
}
.content {
  border: solid #ccc;
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
.projects-list {
  text-align: left;
  .card {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: 8px;
    padding: 4px 8px;
    margin: 3px 8px 6px 8px;
    background-color: #fff;
    .map-link {
      grid-row: 1 / 3;
      display: flex;
      justify-content: center;
      align-items: center;
      img {
        max-height: 120px;
        max-width: 100%;
        width: auto;
        height: auto;
      }
      svg {
        height: 120px;
      }
    }
    .project-link {
      justify-self: start;
      text-decoration: none;
      color: var(--color-primary);
      .title {
        font-size: 20px;
      }
      .name {
        font-weight: 500;
      }
    }
    .details {
      font-size: 13px;
      font-weight: 500;
      color: #555;
      grid-column: 2 / 3;
    }
  }
  .time-info {
    text-align: right;
    font-size: 13.5px;
  }
  .auth {
    grid-area: 1 / 3 / 2 / 4;
    align-self: start;
    justify-self: end;
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
.badge {
  padding: 1px 6px;
  margin: 6px;
  color: #fff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  &.projection {
    background-color: #626262;
  }
  &.auth {
    background-color: var(--color-green);
    text-transform: uppercase;
    font-size: 13px;
    font-weight: 500;
  }
}
</style>
