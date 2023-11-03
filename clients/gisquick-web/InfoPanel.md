
# Custom Info Panel

## Development

Register info panel component for development in `src/dev/components.js`.
You can find out layer's name in **General Information** section on layer settings page.

```javascript
import MyComponent from '@/extensions/MyComponent.vue'

export default {
  infoPanelComponents: [
    {
      layer: 'layername',
      component: MyComponent
    }
  ]
}
```

Write your info panel as a Vue.js 2 component.
You can use all globally registered base UI components registered in `src/ui/plugin.js`, or any components and libraries imported in your code.

```
src/extensions/MyComponent.vue
```

```vue
<template>
  <div class="my-component f-col">
    <!-- your code -->
  </div>
</template>

<script>
export default {
  name: 'ComponentName', // required, must be unique
  props: {
    feature: Object,
    layer: Object,
    project: Object
  },
  // your code
}
</script>

<style lang="scss" scoped>
.my-component {
  @media (min-width: 501px) {
    width: 500px;
  }
}
</style>
```

## Production

### Build selected components as library module

```
npm run build-infopanel
```

#### index.js
```javascript
import component1 from './Component1'
import component2 from './Component2'

export default [
  component1,
  component2
]
```

### Assign component

Open layer settings and click on the `i` icon in **Data Preview** section to display preview of the info panel.
Upload your builded component file (from **./dist** directory and with umd.js file extension) and assign it to the layer.
