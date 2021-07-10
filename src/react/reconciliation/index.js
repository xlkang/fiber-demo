import { arrified, createTaskQueue, createStateNode, getTag, getRoot } from "../Misc"
import { updateNodeElement } from "../Misc/DOM"

const taskQueue = createTaskQueue()
// 执行中的任务
let subTask = null

let pendingCommit = null

// 二阶段任务
const commitAllWork = fiber => {
  fiber.effects.forEach(item => {
    if(item.tag === "class_component") {
      // 如果是类组件
      // 把组件的 fiber 对象添加到组件的 实例对象 上
      item.stateNode.__fiber = item
    }

    if(item.effectTag === "delete") {
      item.parent.stateNode.removeChild(item.stateNode)
    }
    else if (item.effectTag === "update") {
      /**
       * 更新
       */
      if (item.type === item.alternate.type) {
        /**
         * 节点类型相同
         */
        updateNodeElement(item.stateNode, item, item.alternate)
      }
      else {
        /**
         * 节点类型不同
         */
         item.parent.stateNode.replaceChild(
           item.stateNode, // 新节点
           item.alternate.stateNode // 旧节点
         )
      }
    }
    else if (item.effectTag === "placement") {
      // 初始渲染, placement表示追加节点
      let fiber = item;
      let parentFiber = item.parent
      // 类组件本身不是有效的DOM元素
      while (
        parentFiber.tag === "class_component" ||
        parentFiber.tag === "function_component" 
      ) {
        parentFiber = parentFiber.parent
      }
      if(fiber.tag === "host_component") {
        parentFiber.stateNode.appendChild(fiber.stateNode)
      }
    }
  })

  /**
   * 备份根节点对应的fiber对象
   */
  fiber.stateNode.__rootFiberContainer = fiber
}

// 取的是队列中第一个大任务的子任务
const getFirstTask = () => {
  /**
   * 从任务队列中获取任务
   */
  const task = taskQueue.pop()

  if(task.from === "class_component") {
    // 组件状态更新任务
    // 获取根节点的 fiber 对象
    const root = getRoot(task.instance)
    // 存储组件的状态
    task.instance.__fiber.partialState = task.partialState
    
    return {
      props: root.props,
      stateNode: root.stateNode,
      tag: "host_root",
      effects: [],
      child: null,
      alternate: root
    }
  }

  /**
   * 返回最外层节点的fiber对象
   */
  return {
    props: task.props,
    stateNode: task.dom,
    tag: "host_root",
    effects: [],
    child: null,
    alternate: task.dom.__rootFiberContainer
  }
}

const reconcileChildren = (fiber, children) => {
  /**
   * children 可能是对象 也可能是数组
   * 将 children 转换成数组
   */
  const arrifiedChildren = arrified(children)

  let index = 0
  /**
   * children 数组中元素的个数
   */
  let numberOfElements = arrifiedChildren.length
  /**
   * 循环过程中的循环项，就是子节点的 virtualDOM 对象
   */
  let element = null
  /**
   * 子节点 fiber 对象
   */
  let newFiber = null
  /**
   * 上一个兄弟 fiber 对象
   */
  let prevFiber = null
  /**
   * 备份节点
   */
  let alternate = null

  if(fiber.alternate && fiber.alternate.child) {
    alternate = fiber.alternate.child
  }

  // 循环children
  while (
    index < numberOfElements ||
    alternate // 为了执行删除操作
  ) {
    /**
     * 子级 virtualDOM 对象
     */
    element = arrifiedChildren[index]

    if(!element && alternate) {
      /**
       * 删除操作
       */
      alternate.effectTag = "delete"
      fiber.effects.push(alternate)
    }

    else if(element && alternate) {
      /**
       * 更新
       */
      newFiber = {
        type: element.type,
        props: element.props,
        // 动态判断tag
        tag: getTag(element),
        effects: [],
        effectTag: "update",
        parent: fiber,
        alternate
      }

      if(element.type === alternate.type) {
        /**
         * 类型相同
         */
        newFiber.stateNode = alternate.stateNode
      }
      else {
        /**
         * 类型不同
         */
        newFiber.stateNode = createStateNode(newFiber)
      }
    }

    else if(element && !alternate) {
      /**
       * 初始渲染
       */
      /**
       * 子级fiber对象
       */
      newFiber = {
        type: element.type,
        props: element.props,
        // 动态判断tag
        tag: getTag(element),
        effects: [],
        effectTag: "placement",
        parent: fiber
        // stateNode: null,
      }
  
      /**
       * 为fiber节点添加DOM对象或组件实例对象
       */
      newFiber.stateNode = createStateNode(newFiber)
    }

    if(index == 0) {
      // 是第一个子节点
      fiber.child = newFiber
    } 
    else if(element){
      prevFiber.sibling = newFiber
    }

    if(alternate && alternate.sibling)  {
      alternate = alternate.sibling
    } else {
      alternate = null
    }

    prevFiber = newFiber

    index++
  }
}

// 接收任务 -> 执行 -> 返回新的任务
const executeTask = fiber => {
  // 构建子节点 vdom 对象 => fiber.child
  if(fiber.tag === "class_component") {
    if (fiber.stateNode.__fiber && fiber.stateNode.__fiber.partialState) {
      fiber.stateNode.state = {
        ...fiber.stateNode.state,
        ...fiber.stateNode.__fiber.partialState
      }
    }
    // 类组件的子元素是调用实例render方法得到的
    reconcileChildren(fiber, fiber.stateNode.render())
  } 
  else if(fiber.tag === "function_component"){
    // 函数组件
    reconcileChildren(fiber, fiber.stateNode(fiber.props))
  }
  else {
    reconcileChildren(fiber, fiber.props.children)
  }
  
  if (fiber.child) {
    // 有子节点，返回子节点
    return fiber.child
  }

  // 正在处理的fiber节点
  // while结束后，currentExecutelyFiber就是最外层节点的fiber
  let currentExecutelyFiber = fiber
  // 回退到父级节点
  while (currentExecutelyFiber.parent) {
    // 构建Fiber[]
    currentExecutelyFiber.parent.effects = currentExecutelyFiber.parent.effects.concat(
      currentExecutelyFiber.effects.concat([currentExecutelyFiber])
    )

    if(currentExecutelyFiber.sibling) {
      // 有兄弟节点，返回兄弟节点
      return currentExecutelyFiber.sibling
    }
    currentExecutelyFiber = currentExecutelyFiber.parent
  }
  // console.log(fiber)
  // console.log(currentExecutelyFiber)
  pendingCommit = currentExecutelyFiber
}

// 循环执行任务
const workLoop = deadline => {
  /**
   * 如果子任务不存在 就去获取子任务
   */
  if(!subTask) {
    subTask = getFirstTask()
  }

  /**
   * 如果任务存在并且浏览器有空余时间就调用
   * executeTask 方法执行任务 接收任务 -> 执行 -> 返回新的任务
   */
  while (subTask && deadline.timeRemaining() > 1) {
    // 执行完了以后 subTask 是 undefined
    subTask = executeTask(subTask)
  }

  if (pendingCommit) {
    commitAllWork(pendingCommit)
  }
}

// 调度任务
const performTask = deadline => {
  workLoop(deadline)

  /**
   * 判断任务是否存在
   * 判断任务队列中是否还有任务没有执行
   * 再一次告诉浏览器在空闲时间执行任务
   */
  if(subTask || !taskQueue.isEmpty()) {
    requestIdleCallback(performTask)
  }
}

/**
 * 
 * @param {*} element vdom 子级
 * @param {*} dom DOM节点 父级
 */
export const render = (element, dom) => {
  /**
   * 1. 向任务队列中添加任务
   * 2. 指定在浏览器空闲时执行任务
   */

  /**
   * 任务就是通过 vdom 对象 构建 fiber 对象
   */
   taskQueue.push({
     dom, // 父级
     props: { children: element } // 子级
   })

   /**
    * 在空闲时间执行任务
    */
   requestIdleCallback(performTask)
}

export const scheduleUpdate = (instance, partialState) => {
  taskQueue.push({
    from: "class_component",
    instance,
    partialState
  })
  requestIdleCallback(performTask)
}