/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Observable, Observer, Subscriber, Subscription } from 'rxjs'
import * as ReactDOM from 'react-dom'
import * as React from 'react'
import HubComponent from './HubComponent'


interface OutputConnection {
    outputObservable: Observable<any>,
    subscriptions: Connection[]
}

interface InputConnection {
    inputSubscriber: Observer<any>,
    subscription: Subscription
}

interface Connection {
    name: string,
    outputs: Map<string, OutputConnection>,
    inputs: Map<string, Map<string, InputConnection>>
}

type Connections =  Map<string, Connection>;

interface Renderable{
    props?: Observable<any>;
    subscription?: Subscription;
    functionComponent: React.FunctionComponent<any>;
}

interface PlugConfig {
    name: string;
    renderer?: Renderable;
    inputs?: {
        source: string;
        inputSubscriber: Subscriber<any>;
    }[];
    outputs?: {
        name: string;
        outputObservable: Observable<any>;
    }[];
}

type Renderer = (components: Map<string, React.FunctionComponent>, props: Map<string, any>) => void;

const defaultRenderer: Renderer = (components, props) => 
    ReactDOM.render( 
        HubComponent({ components, props }), 
        document.getElementById('main')
    )

const outputNameSeparatot = ":"
const splitOutputName: (outputName: string) => string[] = (outputName) => outputName.split(outputNameSeparatot)

class Hub {
    connections: Connections = new Map()
    components: Map<string, React.FunctionComponent> = new Map()
    currentState: Map<string, any> = new Map()
    propsObservables: Map<string, { source: Observable<any>, subscription: Subscription }> = new Map()
    aggregator: Renderer

    constructor(aggregator: Renderer = defaultRenderer) {
        this.aggregator = aggregator;
    }

    description: () => Map<string, {
        inputs: any[],
        outputs: any[]
    }> = () => {
        const descriptionObj: Map<string, {
            inputs: any[],
            outputs: any[]
        }> = new Map()
        this.connections.forEach((connection, connectionName) => {
            const inputs: any[] = []
            connection.inputs.forEach((inputConnectionSource, inputName) => {
                inputConnectionSource.forEach((outputConnection, outputConnectionName) => {
                    inputs.push([inputName, outputConnectionName])
                })
            })
            const outputs: any[] = []
            connection.outputs.forEach((output, outputName) => {
                const out: any[] = [outputName]
                const outListeners: any[] = []
                output.subscriptions.forEach(s => {
                    outListeners.push(s.name)
                })
                out.push(outListeners)
                outputs.push(out)
            })
            descriptionObj.set(connectionName, {
                inputs,
                outputs
            })
        })
        
        return descriptionObj
    }

    plug: (connection: PlugConfig) => void = (newConnection) => {
        if(!this.connections.has(newConnection.name)){
            this.connections.set(newConnection.name, {
                name: newConnection.name,
                outputs: new Map(),
                inputs: new Map()
            })    
        }

        const currentConnection: Connection = this.connections.get(newConnection.name)
    
        if(newConnection.inputs){
            for(const input of newConnection.inputs){
                const [outputComponentName, outputName] = splitOutputName(input.source)

                if(!this.connections.has(outputComponentName)){
                    this.connections.set(outputComponentName, {
                        name: outputComponentName,
                        outputs: new Map(),
                        inputs: new Map()
                    })
                }

                const connection: Connection = this.connections.get(outputComponentName)

                if(!connection.outputs.has(outputName)){
                    connection.outputs.set(outputName, {
                        outputObservable: null,
                        subscriptions:[]
                    })
                }
                const outputConnection: OutputConnection = connection.outputs.get(outputName)

                let subscription: Subscription = null
                if(outputConnection.outputObservable){
                    subscription = outputConnection.outputObservable.subscribe(input.inputSubscriber)
                }
                outputConnection.subscriptions.push(currentConnection)
                if(!currentConnection.inputs.has(outputComponentName)){
                    currentConnection.inputs.set(outputComponentName, new Map())
                }
                const inputFor = currentConnection.inputs.get(outputComponentName)
                if(inputFor.has(outputName)){
                    inputFor.get(outputName).subscription.unsubscribe()
                }
                inputFor.set(outputName, {
                    inputSubscriber: input.inputSubscriber,
                    subscription: subscription
                })
            }
        }

        if(newConnection.outputs){
            //unsubscribe outputs
            currentConnection.outputs.forEach((outputValue, outputKey) => {
                outputValue.subscriptions.forEach( s => {
                    const inputOnOtherConnectionForConnection = s.inputs.get(currentConnection.name)
                    const inputOnOtherConnectionForOutput = inputOnOtherConnectionForConnection.get(outputKey)
                    if(inputOnOtherConnectionForOutput.subscription){
                        inputOnOtherConnectionForOutput.subscription.unsubscribe()
                    }

                    //resubscribe output if available
                    for(const newOutput of newConnection.outputs){
                        if(newOutput.name === outputKey){
                            outputValue.outputObservable = newOutput.outputObservable
                            inputOnOtherConnectionForOutput.subscription = outputValue.outputObservable.subscribe(inputOnOtherConnectionForOutput.inputSubscriber)
                        }
                    }
                })
            })

            for(const o of newConnection.outputs){
                if(!currentConnection.outputs.has(o.name)){
                    currentConnection.outputs.set(o.name, {
                        outputObservable: o.outputObservable,
                        subscriptions: []
                    })
                }
            }
        }
        if(newConnection.renderer){
            this.components.set(newConnection.name, newConnection.renderer.functionComponent)
            if(newConnection.renderer.props){
                const sub = newConnection.renderer.props.subscribe((state: any) => {
                    this.currentState.set(newConnection.name, state)
                    this.aggregator(this.components, this.currentState)
                })

                this.propsObservables.set(newConnection.name, {
                    source: newConnection.renderer.props,
                    subscription: sub
                })
            }
        }
    }

    unplug: (componentName: string) => void = (componentName) => {
        const currentConnection = this.connections.get(componentName)
        currentConnection.outputs.forEach((out, outName) => out.subscriptions.forEach( s => {
            s.inputs.get(componentName).forEach( s => s.subscription.unsubscribe())
        }))
        currentConnection.inputs.forEach(c => c.forEach( co => co.subscription.unsubscribe()  ))
        this.currentState.delete(componentName)
        this.components.delete(componentName)
        if(this.propsObservables.has(componentName)){
            const propsObservable = this.propsObservables.get(componentName)
            propsObservable.subscription.unsubscribe()
            this.propsObservables.delete(componentName)
        }
        
        this.aggregator(this.components, this.currentState)
    }

    size: () => number = () => this.connections.size
}

export { Hub }