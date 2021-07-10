/**
 * 为Dom元素添加属性
 * @param {*} newElement 
 * @param {*} virtualDOM 
 * @param {*} oldVirtualDOM 
 */
export default function updateNodeElement(
  newElement, 
  virtualDOM, 
  oldVirtualDOM = {}
) {
  // 获取节点对应的属性对象
  const newProps = virtualDOM.props || {}
  const oldProps = oldVirtualDOM.props || {}

  if (virtualDOM.type === "text") {
    if(newProps.textContent !== oldProps.textContent) {
      if(virtualDOM.parent.type !== oldVirtualDOM.parent.type) {
        // 父级节点类型不同
        virtualDOM.parent.stateNode.appendChild(
          document.createTextNode(newProps.textContent)
        )
      }
      else {
        // 父级节点类型相同
        virtualDOM.parent.stateNode.replaceChild(
          document.createTextNode(newProps.textContent),
          oldVirtualDOM.stateNode
        )
      }
    }
    return
  }

  Object.keys(newProps).forEach(propName => {
    const newPropsValue = newProps[propName];
    const oldPropsValue = oldProps[propName];

    if(newPropsValue !== oldPropsValue) {
      // 新值不等于旧值，包含了初始化的情况
      // 判断属性是否是事件属性
      if(propName.slice(0,2) === 'on') {
        // 事件名称
        const eventName = propName.slice(2).toLocaleLowerCase()
        // 为元素添加事件
        newElement.addEventListener(eventName, newPropsValue)

        if(oldPropsValue) {
          // 移除原来的事件
          newElement.removeEventListener(eventName, oldPropsValue)
        }
      } else if(propName === "value" || propName === "checked") {
        // value和checked不能通过setAttribute添加
        newElement[propName] = newPropsValue
      } else if(propName !== "children") {
        if (propName === "className") {
          newElement.setAttribute('class', newPropsValue)
        } else {
          newElement.setAttribute(propName, newPropsValue)
        }
      }
    }
  })

  // 考虑属性被删除的情况
  Object.keys(oldProps).forEach(propName => {
    const newPropsValue = newProps[propName];
    const oldPropsValue = oldProps[propName];
    if(!newPropsValue) {
      // 属性被删除了
      if(propName.slice(0,2) === 'on') {
        // 属性是事件的话需要移除
        const eventName = propName.toLocaleLowerCase().slice(2)
        newElement.removeEventListener(eventName, oldPropsValue)
      } else if(propName !== "children") {
        // 普通属性（包含value和checked）
        newElement.removeAttribute(propName)
      }
    }
  })
}