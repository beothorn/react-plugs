import { HubComponent } from './HubComponent'
import * as React from "react"
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

test('Render all components', () => {
    const component: React.FunctionComponent<any> = ({val}) => <p>{val}</p>

    const components = new Map(Object.entries({ 
        "a": component,
        "b": component
    }));

    const props = new Map(Object.entries({ 
        "a": {"val": "Foo"},
        "b": {"val": "Bar"}
    }));

    render(<HubComponent 
        components={components} 
        props={props}
    />)
    expect(screen.getByText("Foo")).toBeInTheDocument()
    expect(screen.getByText("Bar")).toBeInTheDocument()
})