// Serviço Avisos da Cantina.
//
// Reage ao evento cantina.pedido.confirmado (contrato em
// contratos/pedido-confirmado.json), recebido em POST /eventos no envelope
// CloudEvents 1.0. Não conhece o Pedidos: só conhece o formato do evento.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

type ItemAvisado struct {
	ItemID     int    `json:"itemId"`
	Nome       string `json:"nome"`
	Quantidade int    `json:"quantidade"`
}

type PedidoConfirmado struct {
	PedidoID      int           `json:"pedidoId"`
	AlunoID       string        `json:"alunoId"`
	TotalCentavos int           `json:"totalCentavos"`
	Itens         []ItemAvisado `json:"itens"`
}

type Evento struct {
	SpecVersion string           `json:"specversion"`
	ID          string           `json:"id"`
	Source      string           `json:"source"`
	Type        string           `json:"type"`
	Time        string           `json:"time"`
	Subject     string           `json:"subject"`
	Data        PedidoConfirmado `json:"data"`
}

type Aviso struct {
	EventoID string `json:"eventoId"`
	AlunoID  string `json:"alunoId"`
	Mensagem string `json:"mensagem"`
	EnviadoEm string `json:"enviadoEm"`
}

var (
	nome    = envOu("NOME", "avisos")
	mu      sync.Mutex
	vistos  = map[string]bool{} // o mesmo evento pode chegar duas vezes
	avisos  = []Aviso{}
)

func envOu(chave, padrao string) string {
	if v := os.Getenv(chave); v != "" {
		return v
	}
	return padrao
}

func responderJSON(w http.ResponseWriter, status int, corpo any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(corpo)
}

func erro(w http.ResponseWriter, status int, codigo, mensagem string) {
	responderJSON(w, status, map[string]string{"codigo": codigo, "mensagem": mensagem})
}

func receberEvento(w http.ResponseWriter, r *http.Request) {
	var ev Evento
	if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
		erro(w, http.StatusBadRequest, "EVENTO_INVALIDO", "O corpo não é um CloudEvent em JSON.")
		return
	}
	if ev.SpecVersion != "1.0" || ev.ID == "" || ev.Data.AlunoID == "" {
		erro(w, http.StatusBadRequest, "EVENTO_INVALIDO", "Faltam campos obrigatórios do envelope ou do pedido.")
		return
	}
	if ev.Type != "cantina.pedido.confirmado" {
		// Evento que não interessa: aceita e ignora, para não travar quem publica.
		responderJSON(w, http.StatusAccepted, map[string]string{"status": "ignorado"})
		return
	}

	mu.Lock()
	defer mu.Unlock()
	if vistos[ev.ID] {
		responderJSON(w, http.StatusAccepted, map[string]string{"status": "repetido"})
		return
	}
	vistos[ev.ID] = true
	aviso := Aviso{
		EventoID: ev.ID,
		AlunoID:  ev.Data.AlunoID,
		Mensagem: fmt.Sprintf("Seu pedido %d foi confirmado. Total: R$ %d,%02d.",
			ev.Data.PedidoID, ev.Data.TotalCentavos/100, ev.Data.TotalCentavos%100),
		EnviadoEm: time.Now().UTC().Format(time.RFC3339),
	}
	avisos = append(avisos, aviso)
	log.Printf("[%s] aviso para %s: %s", nome, aviso.AlunoID, aviso.Mensagem)
	responderJSON(w, http.StatusAccepted, map[string]string{"status": "avisado"})
}

func main() {
	porta := envOu("PORTA", "8083")
	http.HandleFunc("POST /eventos", receberEvento)
	http.HandleFunc("GET /avisos", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		responderJSON(w, http.StatusOK, avisos)
	})
	http.HandleFunc("GET /saude", func(w http.ResponseWriter, r *http.Request) {
		responderJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	log.Printf("[%s] Avisos na porta %s", nome, porta)
	log.Fatal(http.ListenAndServe(":"+porta, nil))
}
