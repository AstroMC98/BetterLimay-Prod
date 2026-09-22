import { PhilippineTime } from "./PhilippineTime";
import { WeatherInfo } from "./WeatherInfo";

export function InfoBar() {
  return (
    <div className="info-bar" data-testid="info-bar">
      <div className="info-bar__inner">
        <PhilippineTime />
        <WeatherInfo />
      </div>
    </div>
  );
}
