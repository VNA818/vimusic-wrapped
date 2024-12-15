import { getData, initParser, msToHours, parseDB } from "./parseDb.js";

const ONE_REM = parseFloat(getComputedStyle(document.documentElement).fontSize);
let YEARS = [];
const NOT_FOUND_IMG = "./assets/notFound.webp";

for(const x in [...Array((new Date().getFullYear() - 2022) + 1).keys()]) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - x, 0, 1);
    date.setHours(0, 0, 0, 0);
    YEARS.push(date);
}

const clickYear = (event, year) => {
    document.querySelector("#years .selected").classList.remove("selected");
    event.target.classList.add("selected");
    showLoading(true);

    const data = getData(year);
    fillData(data);
    showLoading(false);
}

const fillYears = () => {
    const fillYear = (year) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        const h3 = document.createElement("h3");
        h3.innerText = year.getFullYear?.() ?? year;
        button.appendChild(h3);
        button.addEventListener("click", (event) => clickYear(event, typeof year !== "string" ? year : undefined));
        li.appendChild(button);
        return li;
    }
    const years = document.getElementById("years");
    const element = fillYear("All Time");
    element.classList.add("selected");
    years.appendChild(element);
    for(const year of YEARS) {
        const element = fillYear(year);
        years.appendChild(element);
    }
}

const addSong = (index, data) => {
    const song = document.createElement("div");
    song.classList.add("song");
    const h1 = document.createElement("h1");
    h1.innerText = `${index}.`;
    if(index === 1) {
        h1.classList.add("extraSpace");
    }
    song.appendChild(h1);
    const img = document.createElement("img");
    img.src = data.thumbnailUrl?.replace("w60-h60-", "w120-h120-") ?? NOT_FOUND_IMG;
    img.alt = "Album Art";
    song.appendChild(img);
    const div = document.createElement("div");
    div.classList.add("songInfo");

    const title = document.createElement("span");
    title.classList.add("songTitle");
    title.innerText = data.title;

    const artist = document.createElement("span");
    artist.classList.add("songArtist");
    artist.innerText = data.artistsText;

    const hours = document.createElement("span");
    hours.classList.add("songHours");
    hours.innerText = `${msToHours(data.totalPlayTimeMs)} Hours Listened`;

    div.appendChild(title);
    div.appendChild(artist);
    div.appendChild(hours);
    song.appendChild(div);
    return song;
}

const addArtist = (index, data) => {
    const div = document.createElement("div");
    div.classList.add("artist");
    const h1 = document.createElement("h1");
    h1.innerText = `${index}.`;
    if(index === 1) {
        h1.classList.add("extraSpace");
    }
    div.appendChild(h1);
    const artist = document.createElement("div");

    const img = document.createElement("img");
    img.src = data.thumbnailUrl ?? NOT_FOUND_IMG;
    img.alt = "Artist Picture";
    artist.appendChild(img);

    const artistName = document.createElement("span");
    artistName.innerText = data.name;

    const artistHours = document.createElement("span");
    artistHours.innerText = `${msToHours(data.totPlay)} Hours Listened`;
    artistHours.classList.add("artistHours");

    const infoDiv = document.createElement("div");
    infoDiv.classList.add("artistInfo");
    infoDiv.appendChild(artistName);
    infoDiv.appendChild(artistHours);
    artist.appendChild(infoDiv);

    div.appendChild(artist);
    return div;
}

const addTimeStats = (data) => {
    document.getElementById("totalHours").innerText = `${msToHours(data.totalTime)} Hours`;
    document.getElementById("mostDay").innerText = data.topDay.day.replace(/, ([0-9]+)/, "");
    document.getElementById("mostDayTime").innerText = `${msToHours(data.topDay.val)} Hours Listened`;
}

const fillData = (data) => {
    if(!data) {
        document.getElementById("contentData").style.display = "none";
        document.getElementById("noData").style.display = "flex";
        document.getElementById("share").style.display = "none";
        return;
    }
    document.getElementById("noData").style.display = "none";
    document.getElementById("contentData").style.display = "block";
    document.getElementById("share").style.display = "block";

    const songs = document.getElementById("songs");
    songs.innerHTML = "";
    data.topPlayed.forEach((song, i) => {
        songs.appendChild(addSong(i + 1, song));
    });

    const artists = document.getElementById("artists");
    artists.innerHTML = "";
    data.topArtists.forEach((artist, i) => {
        artists.appendChild(addArtist(i + 1, artist));
    });

    addTimeStats({ topDay: data.topDay, totalTime: data.totalTime });
}

const showLoading = (show) => {
    document.getElementById("loading").style.display = show ? "flex" : "none";
}

window.onload = async () => {
    fillYears();
    await initParser();
    showLoading(false);

    document.getElementById("share").addEventListener("click", async () => {
        showLoading(true);
        const content = document.getElementById("contentData");
        const width = 750;

        try {
            const sheet = Array.from(document.styleSheets).find(style => style.href.includes("/mobile.css"));
            sheet.disabled = true;
            content.style.width = `${width}px`;
            content.classList.add("shareDiv");

            //fetch notfound image uri
            const blob = await fetch(NOT_FOUND_IMG).then(r => r.blob());
            const notFoundUri = await new Promise(res => {
                const reader = new FileReader();
                reader.onload = () => res(reader.result);
                reader.readAsDataURL(blob);
            });

            htmlToImage.toJpeg(content, {
                skipFonts: true,
                width,
                height: content.scrollHeight - 3 * ONE_REM,
                imagePlaceholder: notFoundUri
            })
                .then((uri) => {
                    const arr = uri.split(",");
                    let bstr = window.atob(arr[arr.length - 1]);
                    let n = bstr.length
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    const file = new File([u8arr], "vimusic-wrapped.jpeg", { type: "image/jpeg" });

                    sheet.disabled = false;
                    content.classList.remove("shareDiv");
                    content.style.width = `100%`;

                    navigator.share({
                        files: [ file ]
                    });

                    showLoading(false);
                });
        } catch(err) {
            console.log("Failed To Share", err);
        }
    });

    document.getElementById("aboutBtn").addEventListener("click", () => {
        document.getElementById("about").showModal();
    });

    document.getElementById("about").addEventListener("click", (event) => {
        if(event.target.id === "about") {
            event.target.close();
        }
    });

    document.getElementById("uploadFile").addEventListener("click", () => {
        document.getElementById("myFile").click();
    });

    document.getElementById("myFile").addEventListener("change", async (event) => {
        showLoading(true);

        await parseDB(event.target.files[0]);
        const data = getData();

        if(window.innerWidth >= 500) {
            document.getElementById("title").innerText = "ViMusic Wrapped";
        } else {
            document.getElementById("title").innerText = "Wrapped";
        }
        document.getElementById("initial").style.display = "none";
        document.getElementById("main").style.display = "flex";

        fillData(data);
        showLoading(false);
    });
};
