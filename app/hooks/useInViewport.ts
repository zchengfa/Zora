import { useEffect, useState, RefObject } from 'react';

export const useInViewport = (ref: RefObject<Element>, rootMargin ='0px 0px -50px 0px') => {

  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {

    const node = ref.current;

    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {rootMargin}
    );

    observer.observe(node);

    return () => {
      observer.unobserve(node);
      observer.disconnect();
    };

  }, [ref, rootMargin]);

  return isIntersecting;

}
