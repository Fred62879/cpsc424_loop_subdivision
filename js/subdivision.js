//  This is where most of your code changes belong

function subdivider (input_mesh) {
    this.meshes = [];

    this.new_edges = [];
    this.new_faces = [];
    this.new_vertices = [];
    this.old_vertices = [];
    this.vertex_map = new Map();

    // Initializes this subdivision object with a mesh to use as
    // the control mesh (ie: subdivision level 0).
    this.meshes.push(input_mesh);

    this.vertex_to_array = function (vertices) {
        for (var i = 0; i < vertices.length; i++) {
            var vertex = vertices[i];
            var pos = vertex.getPos();
            vertices[i] = [pos.x(),pos.y(),pos.z()];
        }
    }

    this.add_vertex = function(origin, end) {
        var id1 = origin.getId();
        var id2 = end.getId();
        if (id1 > id2) [id1, id2] = [id2, id1];
        var key = String(id1) + "," + String(id2);

        if (this.vertex_map.has(key))
            return this.vertex_map.get(key);

        var pos1 = origin.getPos();
        var pos2 = end.getPos();
        var new_x = (pos1.value[0] + pos2.value[0])/2;
        var new_y = (pos1.value[1] + pos2.value[1])/2;
        var new_z = (pos1.value[2] + pos2.value[2])/2;

        var id = this.old_vertices.length + this.new_vertices.length;
        var vertex = new Vertex(new_x, new_y, new_z, id);

        this.new_vertices.push(vertex);
        this.vertex_map.set(key, vertex);
        return vertex;
    }

    this.add_edge = function (origin_id, id) {
        var origin = this.new_edges[origin_id].getOrigin();
        var edge = new HalfEdge(id);
        edge.setOrigin(origin);
        this.new_edges.push(edge);
        return edge;
    }

    this.link_edges = function (edge1, edge2, edge3) {
        edge1.setNext(edge2);edge2.setPrev(edge1);
        edge2.setNext(edge3);edge3.setPrev(edge2);
        edge3.setNext(edge1);edge1.setPrev(edge3);
    }

    this.add_face = function(edge) {
        var edge1 = edge;
        var edge2 = edge.getNext();
        var edge3 = edge.getPrev();
        var new_face = [[edge1.getOrigin().getId()],
                        [edge2.getOrigin().getId()],
                        [edge3.getOrigin().getId()]];
        this.new_faces.push(new_face);
    }

    this.split_edge = function (he) {
        var origin = he.getOrigin();
        var end = he.getNext().getOrigin();
        var new_vertex = this.add_vertex(origin, end);

        var prev = he.getPrev();
        var next = he.getNext();
        var edge_id = this.new_edges.length;

        var new_he1 = new HalfEdge(edge_id);
        var new_he2 = new HalfEdge(edge_id + 1);
        this.new_edges.push(new_he1);
        this.new_edges.push(new_he2);

        new_he1.setOrigin(new_vertex);
        new_he2.setOrigin(origin);

        new_he1.setPrev(new_he2);
        new_he1.setNext(next);
        new_he2.setPrev(prev);
        new_he2.setNext(new_he1);
        prev.setNext(new_he2);
        next.setPrev(new_he1);
    }

    // cut a face based on 6 half-edges created during split for one face
    this.cut_a_face = function (id_lo) {
        var new_id_lo = this.new_edges.length;

        var edge1 = this.add_edge(id_lo + 4, new_id_lo);
        var edge2 = this.add_edge(id_lo,     new_id_lo + 1);
        var edge3 = this.add_edge(id_lo + 2, new_id_lo + 2);
        this.link_edges(edge1, this.new_edges[id_lo], this.new_edges[id_lo+5]);
        this.link_edges(edge2, this.new_edges[id_lo+2], this.new_edges[id_lo+1]);
        this.link_edges(edge3, this.new_edges[id_lo+4], this.new_edges[id_lo+3]);
        this.add_face(edge1);this.add_face(edge2);this.add_face(edge3);

        // twin edges of the three new edges above
        var edge1t = this.add_edge(id_lo,     new_id_lo + 3);
        var edge2t = this.add_edge(id_lo + 4, new_id_lo + 4);
        var edge3t = this.add_edge(id_lo + 2, new_id_lo + 5);
        this.link_edges(edge1t, edge2t, edge3t);
        this.add_face(edge1t);
    }

    this.subdivide_one_level = function(prev_level) {
        var cur_mesh = this.meshes[prev_level];
        var faces = cur_mesh.getFaces();

        // split 3 edges of the same face together
        // so 6 resulting half-edges will be consecutive
        faces.forEach((face) => {
            var edge1 = face.getEdge();
            var edge2 = edge1.getPrev();
            var edge3 = edge1.getNext();
            this.split_edge(edge1);
            this.split_edge(edge2);
            this.split_edge(edge3);
        });

        var num_faces = faces.length;
        console.assert(this.new_edges.length % 6 == 0);
        for (var i = 0; i < num_faces; i++) {
            this.cut_a_face(i*6);
        }
    }

    this.create_new_mesh = function () {
        // create new mesh
        console.log('creat new mesh');
        var vertices = this.old_vertices.concat(this.new_vertices);
        this.vertex_to_array(vertices);
        var new_mesh = new Mesh();
        new_mesh.builMesh(vertices, [], this.new_faces);
        new_mesh.computeNormal();
        console.log('add new mesh');
        this.meshes.push(new_mesh);
    }

    this.subdivide = function (level) {
        // Subdivides the control mesh to the given subdivision level  .
        // Returns the subdivided mesh .

        // HINT: Create a new subdivision mesh for each subdivision level and
        // store it in memory for later .
        // If the calling code asks for a level that has already been computed,
        // just return the pre-computed mesh!

        var highest_level = this.meshes.length - 1;
        if (level > highest_level) {
            for (var prev_level = highest_level; prev_level < level; prev_level++) {
                console.log(prev_level+1);
                this.new_edges = [];
                this.new_vertices = [];
                this.old_vertices = this.meshes[prev_level].getVertices();
                // this.old_edges = this.meshes[i-1].getEdges();
                this.subdivide_one_level(prev_level);
                this.create_new_mesh();
            }
        }
        console.log(this.meshes);
        return this.meshes[level];
        // console.log(this.meshes[0].getFaces().length);
        // return this.meshes[0];
    }

    this.setMesh = function (mesh) {
        this.clear(mesh);
        this.meshes.push(mesh);
    }

    this.clear = function (m) {
        this.meshes = [];
        this.new_edges = [];
        this.new_faces = [];
        this.new_vertices = [];
        this.old_vertices = [];
        this.vertex_map = new Map();
    }
}
