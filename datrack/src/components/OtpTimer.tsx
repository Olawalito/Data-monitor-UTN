import { useEffect, useState } from "react"

type OtpTimerProps = {
    minutes: number
    active: boolean
    onExpire: () => void
}

export default function OtpTimer( {minutes, active, onExpire}: OtpTimerProps){
    const [seconds, setSeconds] = useState(minutes * 60);

    useEffect(
        () => {
            let intervalId : number;

            if( active && seconds > 0){
                intervalId = setInterval(
                   () => {
                    setSeconds((prevSecond) => prevSecond -1 )
                   }, 1000
                )
            } else if (seconds === 0){
                onExpire
            }

            return () => clearInterval(intervalId);
        }, [active, seconds]
    )

    return(
        <>
        <span>
          {`${Math.floor( seconds/60)} : ${seconds % 60}`}
        </span>
        </>
    )
}