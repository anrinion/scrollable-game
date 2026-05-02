class SwipeGameVisualizer {
  constructor(engine, config, container) {
    if (typeof vis === "undefined") {
      throw new Error(
        "vis-network not loaded. Add the CDN script for vis-network.",
      );
    }
    this.engine = engine;
    this.config = config;
    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    this.network = null;
    this.previousState = null;
    this._edgeEventMap = new Map();
    this._currentLevelId = null;

    this._bindEvents();

    if (engine.currentLevel) {
      this._renderGraph();
      this._highlightCurrentState();
    }
  }

  _bindEvents() {
    this.engine.on("stateChange", ({ level }) => {
      if (!this.network || this._currentLevelId !== level.id) {
        this._renderGraph();
        this._currentLevelId = level.id;
      }
      this._highlightCurrentState();
    });
  }

  _renderGraph() {
    const level = this.engine.currentLevel;
    if (!level || !level.id) return;

    const levelId = level.id;
    const nodesData = [];
    const edgesData = [];
    this._edgeEventMap.clear();

    for (const [id] of Object.entries(level.nodes)) {
      const isCurrent = id === this.engine.currentState;
      nodesData.push({
        id,
        label: `${levelId}.${id}`,
        shape: "box",
        color: {
          background: isCurrent ? "#A5D6A7" : "#E3F2FD",
          border: isCurrent ? "#388E3C" : "#1976D2",
          highlight: {
            background: isCurrent ? "#C8E6C9" : "#BBDEFB",
            border: isCurrent ? "#2E7D32" : "#1565C0",
          },
        },
        font: { size: 16, face: "sans-serif", color: "#111111", bold: true },
        margin: 12,
      });
    }

    for (const [fromId, node] of Object.entries(level.nodes)) {
      if (!node.transitions) continue;
      node.transitions.forEach((trans, idx) => {
        if (!level.nodes[trans.target]) return; // skip inter‑level edges

        const edgeId = `${fromId}_${trans.target}_${idx}`;
        edgesData.push({
          id: edgeId,
          from: fromId,
          to: trans.target,
          label: trans.event,
          arrows: "to",
          color: { color: "#90A4AE", highlight: "#FF6F00" },
          width: 2,
          font: {
            size: 14,
            face: "sans-serif",
            color: "#ffffff",
            strokeWidth: 3,
            strokeColor: "#000000",
            align: "horizontal",
          },
          length: 200,
        });
        this._edgeEventMap.set(edgeId, trans.event);
      });
    }

    console.log(
      "[Visualizer] Nodes to render:",
      nodesData.map((n) => n.id),
    );
    console.log(
      "[Visualizer] Edges to render:",
      edgesData.map((e) => `${e.from} -> ${e.to} (${e.id})`),
    );

    // ── Thorough cleanup ──
    if (this.network) {
      // Remove all event listeners we explicitly added
      this.network.off("selectEdge");
      this.network.off("selectNode");
      this.network.destroy();
      this.network = null;
    }
    // Remove every child of the container, just in case the destroy left anything
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    console.log(
      "[Visualizer] Container children after wipe:",
      this.container.childElementCount,
    );

    // ── Create new network ──
    const data = {
      nodes: new vis.DataSet(nodesData),
      edges: new vis.DataSet(edgesData),
    };
    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: "UD",
          sortMethod: "directed",
          levelSeparation: 120,
          nodeSpacing: 180,
        },
      },
      physics: false,
      interaction: {
        dragNodes: false,
        zoomView: true,
        dragView: true,
        navigationButtons: false,
        keyboard: false,
      },
      edges: {
        smooth: {
          type: "cubicBezier",
          forceDirection: "vertical",
          roundness: 0.4,
        },
      },
    };

    this.network = new vis.Network(this.container, data, options);

    // Check what the network actually contains immediately
    const actualNodeIds = this.network.body.data.nodes.getIds();
    const actualEdgeIds = this.network.body.data.edges.getIds();
    console.log("[Visualizer] Network actual node IDs:", actualNodeIds);
    console.log("[Visualizer] Network actual edge IDs:", actualEdgeIds);

    this.network.once("afterDrawing", () => {
      this.network.fit({ animation: { duration: 400 } });
    });

    // Edge click → simulate event
    this.network.on("selectEdge", (params) => {
      if (params.edges.length === 0) return;
      const edgeId = params.edges[0];
      const eventType = this._edgeEventMap.get(edgeId);
      if (eventType) {
        setTimeout(() => this.network.unselectAll(), 200);
        this.engine.handleEvent(eventType);
      }
    });

    // Node click → jump to that state (dev tool)
    this.network.on("selectNode", (params) => {
      if (params.nodes.length === 0) return;
      const nodeId = params.nodes[0];
      if (nodeId !== this.engine.currentState) {
        console.log(`[Visualizer] Node click – jumping to ${nodeId}`);
        this.engine.jumpToState(nodeId);
      }
    });
  }

  _highlightCurrentState() {
    if (!this.network) return;
    const currentState = this.engine.currentState;

    if (this.previousState && this.previousState !== currentState) {
      this.network.body.data.nodes.update({
        id: this.previousState,
        color: { background: "#E3F2FD", border: "#1976D2" },
      });
    }

    this.network.body.data.nodes.update({
      id: currentState,
      color: { background: "#A5D6A7", border: "#388E3C" },
    });
    this.previousState = currentState;
  }
}

if (typeof window !== "undefined") {
  window.SwipeGameVisualizer = SwipeGameVisualizer;
}
