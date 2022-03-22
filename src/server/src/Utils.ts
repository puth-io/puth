export async function getAbsolutePaths(on: any): Promise<[[string, number][] | string][]> {
  if (!Array.isArray(on)) {
    on = [on];
  }

  return await Promise.all(on.map((el) => getAbsolutePath(el)));
}

export async function getAbsolutePath(on: any): Promise<[string, number][] | string> {
  let onType = resolveConstructorName(on);

  if (onType === 'Page') {
    return 'Page';
  }

  if (onType === 'Frame') {
    return 'Frame';
  }

  if (
    onType !== 'ElementHandle' &&
    onType !== 'JSHandle'
  ) {
    return 'Unknown';
  }

  // Check if on is inside an iframe
  //
  // !!! IF ON = JsHandle, there is no contentFrame() function !!!
  //
  // if ((await on.contentFrame()) !== null) {
  //   // TODO implemenet
  // }

  return await on.evaluate((el) => {
    let stack: [string, number][] = [];
    while (el.parentNode != null) {
      let sibCount = 0;
      let sibIndex = 0;

      // TODO Changing this to for of loop breaks the hole thing.
      //      Either disable this lint rule or debug the for of loop.
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < el.parentNode.childNodes.length; i++) {
        let sib = el.parentNode.childNodes[i];
        if (sib.nodeName === el.nodeName) {
          if (sib === el) {
            sibIndex = sibCount;
          }
          sibCount++;
        }
      }

      if (sibCount > 1) {
        // stack.unshift(el.nodeName.toLowerCase() + ':nth-child(' + (sibIndex + 1) + ')');
        stack.unshift([el.nodeName.toLowerCase(), sibIndex]);
      } else {
        stack.unshift(el.nodeName.toLowerCase());
      }
      el = el.parentNode;
    }
    return stack.splice(1);
  });
}

export function resolveConstructorName(object) {
  return object?.__target?.constructor?.name ?? object?.constructor?.name;
}

export async function handleEqual(handle1, handle2) {
  return await handle1._page.evaluate((h1, h2) => h1 === h2, handle1, handle2);
}

/**
 * Retries a function for $time
 *
 * @param time Timeout in milliseconds
 * @param func The function to retry
 * @param test Test for expected value
 * @param cycleTime Min time in millis to take for every $func execution. 0 to disable.
 */
export async function retryFor(time, func, test?: (v: any) => boolean, cycleTime?) {
  cycleTime = cycleTime ?? 25;
  let until = Date.now() + time;
  let returnValue;
  let error;
  let delta = 0;
  let first = true;

  while (Date.now() < until) {
    if (!first) {
      if (delta < cycleTime) {
        await sleep(cycleTime - delta);
      }
    } else {
      first = false;
    }

    let started = Date.now();
    // For performance, we could add another parameter to disable try-catch
    try {
      returnValue = await func();

      // If no test and now error thrown => return
      if (!test) {
        return returnValue;
      }

      // If test and successful => return
      if (test(returnValue)) {
        return returnValue;
      }
    } catch (e) {
      error = e;
    }

    // Async sleep so while doesn't eat the CPU
    delta = Date.now() - started;
  }

  if (error) {
    throw error;
  }

  return returnValue;
}

export function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export function capitalizeFirstLetter(input) {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
