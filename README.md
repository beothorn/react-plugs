# react-plugs

A library for pluggable components using react and rxjs.

Example:

```javascript
import { Hub, Plug } from 'react-plugs'
import * as React from 'react'
import { BehaviorSubject } from 'rxjs'

const hotRandomNumber: BehaviorSubject<any> = new BehaviorSubject({randomNumber: Math.random()})
setInterval( () => {
    hotRandomNumber.next({randomNumber: Math.random()})
}, 2000)

// A random number generator, it has an output
// that other plugs can subscribe to using source "RandomNumberGenerator:number"
// Only the name is a required field

const randomNumberGenerator = {
    name: "RandomNumberGenerator",
    outputs: [
        {
            name: "number",
            outputObservable: hotRandomNumber
        }
    ]
}

// This will display the last random number generated
class RandomNumberDisplay implements Plug {
    widgetProps: Subject<any> = new Subject()
    name = "RandomNumberDisplay"
    inputs = [
        {
            // subscribes to "RandomNumberGenerator:number"
            // if RandomNumberGenerator is not yet plugged but is added later this
            // input will subscribe to it when RandomNumberGenerator is added
            source: "RandomNumberGenerator:number",
            inputSubscriber: (randomNumberGeneratorOutput) => {
                // Update props for functionComponent by calling the props observable
                this.widgetProps.next({randomNumber: randomNumberGeneratorOutput.randomNumber})
            }
        }
    ]
    renderer = {
        // An observable for the properties passed to function component
        props: this.widgetProps,
        functionComponent: ({randomNumber}) => <p>Random number: {randomNumber}</p>
    }
}

const hub = new Hub()

hub.plug(randomNumberGenerator)
hub.plug(new RandomNumberDisplay())

setInterval( () => {
    hub.unplug("RandomNumberDisplay") // also will unsubscribe all observers from any input or output
}, 6000)

```
See more on the [demo](https://github.com/beothorn/react-plugs-demo)

Instalation:
```
npm install --save react-plugs
```

# Debugger connection

This will print some debugging:

```javascript
hub.plug({
  name: "Debugger",
  inputs: [{
    source: "Hub:debug",
    inputSubscriber: (a: string) => console.log(a)
  }]
})
```

# Custom renderer

```javascript
const Renderer:React.FunctionComponent<{ 
    components: Map<string, React.FunctionComponent> ,
    props: Map<string, any>
}> = ({ components, props }) => {    
  const rendered: React.ReactElement[] = []
  components.forEach( (Component, key) => 
    rendered.push(
      <div className="box">
        <h1>{key}</h1>
        <Component key={key} {...(props.get(key))} />
      </div>
    )
  )
  return <React.StrictMode> 
    {rendered} 
  </React.StrictMode>
}


new Hub((components, props) => 
  ReactDOM.render( 
    Renderer({ components, props), 
    document.getElementById('main')
  )
)
```