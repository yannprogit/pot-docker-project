<template>
  <div id="app">
    <h1>Prehistoric animals in Path of titans</h1>
    
    <div class="cards">
      <div
        class="card"
        v-for="animal in animals"
        :key="animal.name"
      >
        <h2>{{ animal.name }}</h2>
        <p><strong>Diet :</strong> {{ animal.diet }}</p>
        <p><strong>Clade :</strong> {{ animal.clade }}</p>
      </div>
    </div>

    <p v-if="loading">Loading…</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      animals: [],
      loading: false,
      error: null
    };
  },
  mounted() {
    this.fetchAnimals();
  },
  methods: {
    fetchAnimals() {
      this.loading = true;
      fetch(`${process.env.VUE_APP_API_BASE}/animals`)
        .then((res) => res.json())
        .then((data) => {
          this.animals = data;
          this.loading = false;
        })
        .catch((err) => {
          this.error = "Erreur lors du chargement des animaux";
          this.loading = false;
          console.error(err);
        });
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, sans-serif;
  text-align: center;
  padding: 20px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
}

.error {
  color: red;
}
</style>
