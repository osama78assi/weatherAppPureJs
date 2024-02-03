import React from "react";

// Get The Icon Depending On The Weather Code (From API)
function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

// Format The Day
function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.searchInput = React.createRef();
    this.state = {
      location: "", // The Search Input
      isLoading: false, // Loading Data
      displayLocation: "", // The Position From API
      error: "", // If There An Error
      weather: {}, // The Weather Object From An API
    };
    this.requestController = new AbortController(); // Control The Heavy Requests To The API
    this.fetchWeather = this.fetchWeather.bind(this);
    this.handelEnterPress = this.handelEnterPress.bind(this);
    this.clear = this.clear.bind(this);
  }

  // Get Data From An API
  async fetchWeather() {
    if (this.state.location.length < 2) return this.setState({ weather: {} });
    try {
      this.setState({ isLoading: true });
      this.setState({ error: "" });
      this.setState({ weather: {} });
      // 1) Getting location (geocoding)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${this.state.location}`,
        { signal: this.requestController.signal }
      );

      if (!geoRes.ok) throw new Error("Location Not Found");
      const geoData = await geoRes.json();
      console.log(geoData);

      if (!geoData.results) throw new Error("Location not found");

      const { latitude, longitude, timezone, name, country_code } =
        geoData.results.at(0);
      this.setState({
        displayLocation: `${name}`,
      });

      // 2) Getting actual weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`,
        { signal: this.requestController.signal }
      );
      const weatherData = await weatherRes.json();
      this.setState({ weather: weatherData.daily });
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.log(err);
      this.setState({
        error: "Location Not Found",
        weather: {},
        displayLocation: "",
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Handel Enter Key Press From The User
  handelEnterPress(e) {
    if (document.activeElement !== this.searchInput.current) {
      if (e.code === "Enter") {
        this.searchInput.current.focus();
      }
    }
  }

  componentDidMount() {
    this.setState({ location: localStorage.getItem("value") || "" });
    this.fetchWeather();

    document.addEventListener("keydown", this.handelEnterPress);
  }

  clear() {
    this.requestController.abort();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.location !== prevState.location) {
      this.fetchWeather();
      localStorage.setItem("value", this.state.location);
    }
  }
  
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handelEnterPress);
  }

  render() {
    return (
      <div className="app">
        <h1>Weather</h1>
        <div className="details-container">
          <input
            type="text"
            placeholder="Search from location..."
            value={this.state.location}
            onChange={(e) => this.setState({ location: e.target.value })}
            ref={this.searchInput}
          ></input>
          {this.state.isLoading ? <p className="loader">Loading ...</p> : null}
          {this.state.error ? (
            <Error message={this.state.error} />
          ) : this.state.weather?.weathercode ? (
            <Weather
              weather={this.state.weather}
              displayLocation={this.state.displayLocation}
            />
          ) : null}
        </div>
      </div>
    );
  }
}

class Weather extends React.Component {
  render() {
    const {
      temperature_2m_max: max,
      temperature_2m_min: min,
      time: dates,
      weathercode: codes,
    } = this.props.weather;
    return (
      <div style={{ width: "100%" }}>
        <h2>Weather {this.props.displayLocation}</h2>
        <ul className="weather">
          {dates.map((date, i) => (
            <Day
              date={date}
              max={max[i]}
              min={min[i]}
              code={codes[i]}
              key={date}
              isToday={i === 0}
            />
          ))}
        </ul>
      </div>
    );
  }
}

class Day extends React.Component {
  render() {
    const { date, min, max, code, isToday } = this.props;
    return (
      <li className="day">
        <span>{getWeatherIcon(code)}</span>
        <p>{isToday ? "Today" : formatDay(date)}</p>
        <p>
          {Math.floor(min)}&deg; &mdash; {Math.ceil(max)}&deg;
        </p>
      </li>
    );
  }
}

class Error extends React.Component {
  render() {
    const { message } = this.props;
    return <div className="err">{message}</div>;
  }
}

export default App;
