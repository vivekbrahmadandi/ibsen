type Microdata = { [key: string]: any }

export default function getMicrodata(element: HTMLElement): Microdata {
  function descendToAttribute(scope: HTMLElement, attribute: string) {
    return [].slice.apply(scope.children).reduce((props: string[], child: HTMLElement) => {
      return props.concat(
        child.hasAttribute(attribute)
          ? [child]
          : descendToAttribute(child, attribute)
      )
    }, [])
  }

  function scopesUnder(scope: HTMLElement): any {
    return descendToAttribute(scope, "itemscope")
  }

  function propsUnder(scope: HTMLElement): any {
    return descendToAttribute(scope, "itemprop")
  }

  function dataAtScope(scope: HTMLElement): any {
    return propsUnder(scope).reduce((props: { [key: string]: string }, element: HTMLElement) => {
      props[element.getAttribute("itemprop")] = dataInPropElement(element)
      return props
    }, {})
  }

  function dataInPropElement(element: HTMLElement): any {
    const type = element.getAttribute("itemtype")
    switch (type) {
      case "http://schema.org/Text":
        return element.innerHTML
      case "http://schema.org/Integer":
        return Number(element.innerHTML)
      case "http://schema.org/Boolean":
        return Boolean(element.innerHTML)
      case "http://schema.org/ItemList":
        return scopesUnder(element).map(dataAtScope)
      default:
        throw new Error(
          `Unable to parse element with itemtype '${type}' (itemprop="${element.getAttribute("itemprop")}")`
        )
    }
  }

  const scope = scopesUnder(element)[0]
  if (!scope)
    throw new Error(`Found no itemscope under element: ${element.innerHTML}`)
  return dataAtScope(scope)
}
