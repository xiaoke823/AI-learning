/**
 * 对象map方法
 * @param {Object} obj - 要遍历的对象
 * @param {Function} iteratee - 回调函数 (value, key, object) => [newKey, newValue] | newValue
 * @returns {Object} 新对象
 * 
 * @example
 * // 只返回值
 * mapObject({a: 1, b: 2}, (v) => v * 2) // {a: 2, b: 4}
 * 
 * @example
 * // 返回[key, value]数组可修改键名
 * mapObject({a: 1, b: 2}, (v, k) => [k.toUpperCase(), v * 2]) // {A: 2, B: 4}
 */
export function mapObject(obj, iteratee) {
    if (obj == null || typeof obj !== 'object') return {}
    if (typeof iteratee !== 'function') return { ...obj }

    const result = {}
    const entries = Object.entries(obj)

    for (const [key, value] of entries) {
        const mapped = iteratee(value, key, obj)

        if (Array.isArray(mapped) && mapped.length === 2) {
            result[mapped[0]] = mapped[1]
        } else {
            result[key] = mapped
        }
    }

    return result
}

/**
 * 只映射对象的值（类似lodash的mapValues）
 * @param {Object} obj - 要遍历的对象
 * @param {Function} iteratee - 回调函数 (value, key, object) => newValue
 * @returns {Object} 新对象
 */
export function mapValues(obj, iteratee) {
    return mapObject(obj, (value, key, object) => iteratee(value, key, object))
}

/**
 * 只映射对象的键（类似lodash的mapKeys）
 * @param {Object} obj - 要遍历的对象
 * @param {Function} iteratee - 回调函数 (value, key, object) => newKey
 * @returns {Object} 新对象
 */
export function mapKeys(obj, iteratee) {
    return mapObject(obj, (value, key, object) => [iteratee(value, key, object), value])
}
