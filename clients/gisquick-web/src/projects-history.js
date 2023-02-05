import { set, get } from 'idb-keyval'

export default {
  async getProjectsHistory () {
    const projects = await get('recent-projects')
    return projects ?? []
  },
  setProjectsHistory (value) {
    return set('recent-projects', value)
  },
  async push (projectName) {
    const list = await this.getProjectsHistory()
    const i = list.indexOf(projectName)
    if (i !== -1) {
      list.splice(i, 1)
    }
    list.unshift(projectName)
    await this.setProjectsHistory(list)
  }
}
