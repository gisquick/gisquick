import { set, get } from 'idb-keyval'

export default {
  async getProjectsHistory (user) {
    const projects = await get(`recent-projects:${user.username}`)
    return projects ?? []
  },
  setProjectsHistory (user, value) {
    return set(`recent-projects:${user.username}`, value)
  },
  async push (user, projectName) {
    const list = await this.getProjectsHistory(user)
    const i = list.indexOf(projectName)
    if (i !== -1) {
      list.splice(i, 1)
    }
    list.unshift(projectName)
    await this.setProjectsHistory(user, list)
  }
}
