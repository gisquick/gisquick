import WFS from 'ol/format/wfs'
import http from '@/client'

export function wfsTransaction (owsUrl, layername, { inserts = [], updates = [], deletes = [] }) {
  const wfs = new WFS()
  const opts = {
    featureNS: 'http://gisquick.org',
    featurePrefix: '',
    featureType: layername,
    version: '1.1.0'
  }
  const nodeEl = wfs.writeTransaction(inserts, updates, deletes, opts)
  const query = nodeEl.outerHTML
  const httpOpts = {
    params: {
      'VERSION': '1.1.0',
      'SERVICE': 'WFS'
    },
    headers: {
      'Content-Type': 'text/xml'
    }
    // responseType: 'xml'
  }
  return new Promise((resolve, reject) => {
    http.post(owsUrl, query, httpOpts)
      .then(resp => {
        const respXML = resp.request.responseXML
        if (!respXML) {
          throw new Error('Server error')
        }
        const check = {
          TotalInserted: inserts.length,
          TotalUpdated: updates.length,
          TotalDeleted: deletes.length
        }
        Object.entries(check)
          .filter(([tag, count]) => count > 0)
          .forEach(([tag, count]) => {
            const el = respXML.querySelector(tag)
            const value = el && parseInt(el.textContent)
            if (count !== value) {
              throw new Error('Data update error')
              // reject(new Error('Data update error'))
            }
          })
        resolve()
      })
      .catch(err => {
        if (err.response) {
          const info = err.response.request.responseXML.querySelector('ServiceException')
          const msg = info && info.textContent
          // const el = respXML.querySelector('Message')
          // const err = msg && msg.textContent
          reject(new Error(msg || 'Error'))
        } else {
          reject(err)
        }
      })
  })
}
