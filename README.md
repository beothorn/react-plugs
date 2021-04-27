# react-plugs

Experimental framework for pluggable components using react and rxjs.

A connection is composed by Observables for outputting data, Observers for data input, 
a Properties observable for feeding a react functional component and the react functional component itself.

All those properties are optional. For example you can have a connection that has only an output and does not render
or a connection the has only an input and renders something.

A connection is plugged into the hub using the plug function. The subscription of observers is done depending on 
the component name and its inputs and outputs.

See the [demo](https://github.com/beothorn/react-plugs-demo)