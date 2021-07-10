import React, { render, Component } from "./react"

const root = document.getElementById("root")

const jsx = (
  <div>
    <p>Hello React</p>
    <p>Hi Fiber</p>
  </div>
)

// render(jsx, root)

// setTimeout(() => {
//   const jsx = (
//     <div>
//       <div>阿西吧</div>
//       {/* <p>Hi Fiber</p> */}
//     </div>
//   )
//   render(jsx, root)
// }, 2000)

class Greating extends Component {
  constructor (props) {
    super(props)
    this.state = {
      name: "阿西吧"
    }
  }

  render () {
    return (
      <div>
        {this.props.title}  ahhaha {this.state.name}
        <button onClick={() => this.setState({ name: "奥巴马"})}>更新</button>
      </div>
    )
      
  }
}

render(<Greating title="Hello" />, root)

function FnComponent ({ title }) {
  return <div>{title} FnComponent</div>
}

// render(<FnComponent title="Hello" />, root)
