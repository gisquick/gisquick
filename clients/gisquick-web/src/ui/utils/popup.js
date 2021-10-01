export function pxObj (obj) {
  const val = {}
  Object.keys(obj).forEach(k => {
    val[k] = Math.round(obj[k]) + 'px'
  })
  return val
}

export function elementBounds (el) {
  const b = el.getBoundingClientRect()
  return {
    top: b.top,
    right: b.right,
    bottom: b.bottom,
    left: b.left,
    width: b.width,
    height: b.height,
    x: b.x,
    y: b.y
  }
}

export function pointBounds (x, y, width, height) {
  return {
    left: x - width / 2,
    top: y - height / 2,
    right: x + width / 2,
    bottom: y + height / 2,
    width,
    height
  }
}

/*
cBox - container box
aBox - activator box
pBox - popup box
*/
function alignLeft (cBox, aBox, pBox, edge = 'left') {
  const left = aBox[edge]
  return {
    overflow: Math.max(0, left + pBox.width - cBox.right),
    align: { left }
  }
}

function alignRight (cBox, aBox, pBox, edge = 'right') {
  return {
    overflow: Math.max(0, cBox.left - (aBox[edge] - pBox.width)),
    align: {
      right: cBox.right - aBox[edge]
    }
  }
}

function alignBottom (cBox, aBox, pBox, edge = 'bottom') {
  return {
    overflow: Math.max(0, aBox[edge] + pBox.height - cBox.bottom),
    align: {
      top: aBox[edge]
    },
    info: {
      maxHeight: cBox.bottom - aBox[edge] // - 8
    }
  }
}

function alignTop (cBox, aBox, pBox, edge = 'top') {
  return {
    overflow: Math.max(0, cBox.top - (aBox[edge] - pBox.height)),
    align: {
      bottom: Math.max(0, cBox.bottom - aBox[edge])
    },
    info: {
      maxHeight: aBox[edge] // - 8
    }
  }
}

function alignCenterH (cBox, aBox, pBox) {
  const cx = aBox.left + aBox.width / 2
  const left = cx - pBox.width / 2
  const rOverflow = Math.max(0, left + pBox.width - cBox.right)
  const lOverflow = Math.max(0, cBox.left - left)
  return {
    overflow: Math.max(lOverflow, rOverflow),
    align: {
      left: cx - pBox.width / 2
    }
  }
}

function select (alignments, fn) {
  let best = null
  let bestType = null
  for (const type of alignments) {
    const res = fn(type)
    if (res.overflow === 0) {
      return [type, res.align, res.info]
    }
    if (!best || res.overflow < best.overflow) {
      best = res
      bestType = type
    }
  }
  return [bestType, best.align, best.info]
}

const horizontalAlignFns = {
  ll: alignLeft,
  rl: (cBox, aBox, pBox) => alignLeft(cBox, aBox, pBox, 'right'),
  c: alignCenterH,
  rr: alignRight,
  // screen-left
  sl: (cBox, aBox, pBox) => alignLeft(cBox, cBox, pBox),
  // screen-right
  sr: (cBox, aBox, pBox) => alignRight(cBox, cBox, pBox)
}

const verticalAlignFns = {
  bb: alignBottom,
  tb: (cBox, aBox, pBox) => alignBottom(cBox, aBox, pBox, 'top'),
  tt: alignTop,
  bt: (cBox, aBox, pBox) => alignTop(cBox, aBox, pBox, 'bottom')
}

export function popupFixedPosition (cBox, aBox, pBox, align='ll;bb,tt') {
  const [alx, aly] = align.split(';')
  const [hKey, hAlign] = select(alx.split(','), a => horizontalAlignFns[a](cBox, aBox, pBox))
  const [vKey, vAlign, vInfo] = select(aly.split(','), a => verticalAlignFns[a](cBox, aBox, pBox))
  return {
    key: `${hKey}-${vKey}`,
    position: { ...hAlign, ...vAlign },
    info: vInfo
  }
}
