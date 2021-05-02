/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Observable, PartialObserver, Subscription } from 'rxjs';
import * as ReactDOM from 'react-dom'
import * as React from 'react'
import { HubComponent } from './HubComponent'

interface OutputConnection {
    outputObservable: Observable<any>,
    subscribedConnections: Connection[]
}

interface InputConnection {
    inputSubscriber: PartialObserver<any>,
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
        inputSubscriber: any;
    }[];
    outputs?: {
        name: string;
        outputObservable: Observable<any>;
    }[];
    rank?: number; //TODO: allow ordering
    [key: string]: any;
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

    description: () => Map<string, { //TODO: This should be an input available as Hub:description
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
                output.subscribedConnections.forEach(s => {
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

    getOrCreateConnection(name: string){
        if(!this.connections.has(name)){
            this.connections.set(name, {
                name: name,
                outputs: new Map(),
                inputs: new Map()
            })    
        }
        return this.connections.get(name)
    }

    plug: (connection: PlugConfig) => void = (newConnectionConfig) => {
        const currentConnection: Connection = this.getOrCreateConnection(newConnectionConfig.name)
    
        if(newConnectionConfig.inputs){
            for(const input of newConnectionConfig.inputs){
                const [outputComponentName, outputName] = splitOutputName(input.source)

                const connectionOutputs: Map<string, OutputConnection> = this.getOrCreateConnection(outputComponentName).outputs

                // Create a placeholder on other connection output in case output is ot there yet
                if(!connectionOutputs.has(outputName)){
                    connectionOutputs.set(outputName, {
                        outputObservable: null,
                        subscribedConnections:[]
                    })
                }
                const outputConnections: OutputConnection = connectionOutputs.get(outputName)

                let subscription: Subscription = null
                if(outputConnections.outputObservable){ // for placeholders there is no outputObservable
                    subscription = outputConnections.outputObservable.subscribe(input.inputSubscriber)
                }
                outputConnections.subscribedConnections.push(currentConnection)

                if(!currentConnection.inputs.has(outputComponentName)){
                    currentConnection.inputs.set(outputComponentName, new Map())
                }

                // Unsubscribe input if already had one
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

        if(newConnectionConfig.outputs){
            currentConnection.outputs.forEach((outputValue: OutputConnection, outputKey: string) => {
                outputValue.subscribedConnections.forEach( (s: Connection) => {
                    //unsubscribe outputs
                    const inputOnOtherConnectionForConnection = s.inputs.get(currentConnection.name)
                    const inputOnOtherConnectionForOutput: InputConnection = inputOnOtherConnectionForConnection.get(outputKey)
                    if(inputOnOtherConnectionForOutput.subscription){
                        inputOnOtherConnectionForOutput.subscription.unsubscribe()
                    }

                    // resubscribe output if available
                    // those may be inputs that were subscribed on placeholders
                    for(const newOutput of newConnectionConfig.outputs){
                        if(newOutput.name === outputKey){
                            outputValue.outputObservable = newOutput.outputObservable
                            inputOnOtherConnectionForOutput.subscription = outputValue.outputObservable.subscribe(inputOnOtherConnectionForOutput.inputSubscriber)
                        }
                    }
                })
            })

            for(const newOutput of newConnectionConfig.outputs){
                if(!currentConnection.outputs.has(newOutput.name)){
                    currentConnection.outputs.set(newOutput.name, {
                        outputObservable: newOutput.outputObservable,
                        subscribedConnections: [] // Outputs start with no observers
                    })
                }
            }
        }
        if(newConnectionConfig.renderer){
            this.components.set(newConnectionConfig.name, newConnectionConfig.renderer.functionComponent)
            if(newConnectionConfig.renderer.props){
                const sub = newConnectionConfig.renderer.props.subscribe((state: any) => {
                    this.currentState.set(newConnectionConfig.name, state)
                    this.aggregator(this.components, this.currentState)
                })

                this.propsObservables.set(newConnectionConfig.name, {
                    source: newConnectionConfig.renderer.props,
                    subscription: sub
                })
            }
        }
    }

    unplug: (componentName: string) => void = (componentName) => {
        const currentConnection = this.connections.get(componentName)
        currentConnection.outputs.forEach((out) => out.subscribedConnections.forEach( s => {
            s.inputs.get(componentName).forEach( s => s.subscription.unsubscribe())
        }))
        currentConnection.inputs.forEach(c => c.forEach( co => co.subscription.unsubscribe() ))
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

export { Hub, PlugConfig }