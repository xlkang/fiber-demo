import { arrified, createTaskQueue } from "../Misc"

const taskQueue = createTaskQueue()
// 执行中的任务
let subTask = null

// 取的是队列中第一个大任务的子任务
const getFirstTask = () => {
  /**
   * 从任务队列中获取任务
   */
  const task = taskQueue.pop()

  /**
   * 返回最外层节点的fiber对象
   */
  return {
    props: task.props,
    stateNode: task.dom,
    tag: "host_root",
    effects: [],
    child: null,
  }
}

const reconcileChildren = (fiber, children) => {
  /**
   * children 可能是对象 也可能是数组
   * 将 children 转换成数组
   */
  const arrifiedChildren = arrified(children)

  let index = 0
  let numberOfElements = arrifiedChildren.length
  let element = null
  let newFiber = null
  let prevFiber = null

  // 循环children
  while (index < numberOfElements) {
    element = arrifiedChildren[index]
    newFiber = {
      type: element.type,
      props: element.props,
      tag: "host_component",
      effects: [],
      effectTag: "placement",
      stateNode: null,
      parent: fiber
    }

    if(index == 0) {
      // 是第一个子节点
      fiber.child = newFiber
    } else {
      prevFiber.sibling = newFiber
    }

    prevFiber = newFiber

    index++
  }
}

// 接收任务 -> 执行 -> 返回新的任务
const executeTask = fiber => {
  // 获取子节点 vdom 对象 
  reconcileChildren(fiber, fiber.props.children)
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
    subTask = executeTask(subTask)
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