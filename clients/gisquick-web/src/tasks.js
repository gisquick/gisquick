
export function TaskState () {
  return {
    error: '',
    success: false,
    pending: false
  }
}

export async function watchTask (task, state) {
  state.pending = true
  try {
    const resp = await task
    state.error = ''
    state.success = true
    return resp
  } catch (err) {
    state.error = (!err.isAxiosError && err.message) || 'Error occurred'
    state.success = false
  } finally {
    state.pending = false
  }
}
