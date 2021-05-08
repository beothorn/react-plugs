# react-plugs

Experimental framework for pluggable components using react and rxjs.

A connection is composed by Observables for outputting data, Observers for data input, 
a Properties observable for feeding a react functional component and the react functional component itself.

All those properties are optional. For example you can have a connection that has only an output and does not render
or a connection the has only an input and renders something.

A connection is plugged into the hub using the plug function. The subscription of observers is done depending on 
the component name and its inputs and outputs.

This is an example of a widget that shows a random number

```
import { Hub, Plug } from 'react-plugs'
import { Subject } from 'rxjs'
import * as React from 'react'

const randomNumberSource: Subject<any> = new Subject()

setInterval( () => {
    randomNumberSource.next({randomNumber: Math.random()})
}, 2000)

class RandomNumberGenerator implements Plug {
    name = "RandomNumberGenerator"
    outputs = [
        {
            name: "number",
            outputObservable: randomNumberSource
        }
    ]
}

class RandomNumberDisplay implements Plug {
    name = "RandomNumberDisplay"
    inputs = [
        {
            source: "RandomNumberGenerator:number",
            inputSubscriber: (randomNumberGeneratorOutput) => {
                randomNumberDisplayProps.next({randomNumber: randomNumberGeneratorOutput.randomNumber})
            }
        }
    ]
    renderer = {
        props: randomNumberDisplayProps,
        functionComponent: ({randomNumber}) => <p>Random number: {randomNumber}</p>
    }
}

const hub = new Hub()

hub.plug(new RandomNumberGenerator())
hub.plug(new RandomNumberDisplay())


```

See more on the [demo](https://github.com/beothorn/react-plugs-demo)