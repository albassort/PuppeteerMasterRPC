<script>
  import tofu from "./assets/tofu-vegan.gif";
  let state = "default";
  let result = {
    successful: false,
    badEnter: "",
    goodEnter: "",
  };
</script>

{#if state === "default"}
  <div id="getme">
    <p>GET ME</p>
  </div>
  <div id="dontgetme">
    <p>dont get me</p>
  </div>
  <img alt="tofu" src={tofu} />
  <form>
    <input bind:value={result.goodEnter} id="enter-in-me" />
    <input bind:value={result.badEnter} id="dont-enter-in-me" />
    <button on:click={() => (state = "bad")}>don't click me</button>

    <button
      id="click-me"
      on:click={() => {
        state = "good";
        result.successful = true;
      }}>click me!</button
    >
  </form>
{:else if state == "bad"}
  <div class="result">{JSON.stringify(result)}</div>
{:else if state == "good"}
  <div class="result">{JSON.stringify(result)}</div>
{/if}

<style>
  form {
    display: flex;
    flex-direction: column;
  }
</style>
