/**
 * 创建任务队列
 * @returns 
 */
const createTaskQueue = () => {
  const taskQueue = []

  return {
    push: item => taskQueue.push(item), // 队尾入队
    pop: item => taskQueue.shift(item), // 先进先出
    /**
     * 判断队列中是否还有任务
     */
    isEmpty: () => taskQueue.length === 0
  }
}

export default createTaskQueue
 