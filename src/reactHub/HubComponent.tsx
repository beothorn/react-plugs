import * as React from "react"

const HubComponent:React.FunctionComponent<{ 
        components: Map<string, React.FunctionComponent> ,
        props: Map<string, any>
    }> = ({ components, props }) => {    
    const rendered: React.ReactElement[] = []
    components.forEach( (Component, key) => 
        rendered.push(<Component key={key} {...(props.get(key))} />)
    )
    return <React.StrictMode> {rendered} </React.StrictMode>
}

export { HubComponent } 