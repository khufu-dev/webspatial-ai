import { Model } from "@webspatial/react-sdk";
import "./MainPage.css";

export default function MainPage() {
  return (      
    <div className="mainPage">
      <header>
        <h1>Hello WebSpatial</h1>
      </header>
      <main>
        <Model enable-xr src="/usdz/Mario_Lego.usdz" className="model">
          <img src="/img/Mario_Lego.png" alt="Mario Lego" />
        </Model>
      </main>
    </div>
  );
}
