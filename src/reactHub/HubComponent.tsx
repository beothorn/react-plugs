/* eslint-disable  @typescript-eslint/no-explicit-any */

import * as React from "react"

const HubComponent:React.FunctionComponent<{ 
        components: Map<string, React.FunctionComponent> ,
        props: Map<string, any>,
        sorter: (a: [string, React.FunctionComponent], b: [string, React.FunctionComponent]) => number
    }> = ({ components, props, sorter }) => {    
    const rendered: React.ReactElement[] = []
    const sorted:Map<string, React.FunctionComponent> = new Map(Array.from(components.entries()).sort(sorter))
    sorted.forEach( (Component, key) => 
        rendered.push(<Component key={key} {...(props.get(key))} />)
    )
    return <React.StrictMode> {rendered} </React.StrictMode>
}

export { HubComponent } 