const helloButton = document.getElementById("helloButton");
const message = document.getElementById("message");
const sparkles = document.getElementById("sparkles");

const greeting = "안녕하세요! 반가워요!";
const emojiSet = ["✨", "🎉", "💫", "🌈", "🎈"];

function renderSparkles() {
  sparkles.innerHTML = "";
  emojiSet.forEach((emoji, index) => {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.textContent = emoji;
    spark.style.margin = "0 4px";
    spark.style.animationDelay = `${index * 0.06}s`;
    sparkles.appendChild(spark);
  });
}

helloButton.addEventListener("click", () => {
  message.classList.remove("show");
  message.textContent = greeting;

  // Reflow to replay the pop animation each click.
  void message.offsetWidth;

  message.classList.add("show");
  renderSparkles();
});
