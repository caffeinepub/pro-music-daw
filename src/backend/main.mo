import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";

actor {
  type Project = {
    id : Text;
    name : Text;
    bpm : Nat;
    timeSignatureNumerator : Nat;
    timeSignatureDenominator : Nat;
    createdAt : Int;
    updatedAt : Int;
  };

  type Track = {
    id : Text;
    projectId : Text;
    name : Text;
    color : Text;
    volume : Float;
    pan : Float;
    muted : Bool;
    soloed : Bool;
    effectsChain : Text;
    order : Nat;
  };

  let projects = Map.empty<Text, Project>();
  let tracks = Map.empty<Text, Track>();

  func generateId(prefix : Text) : Text {
    prefix # Time.now().toText();
  };

  func getProjectTracks(projectId : Text) : Iter.Iter<Text> {
    tracks.entries().filter(func((_, track)) { track.projectId == projectId }).map(func((id, _)) { id });
  };

  public shared ({ caller }) func createProject(
    name : Text,
    bpm : Nat,
    timeSignatureNumerator : Nat,
    timeSignatureDenominator : Nat,
  ) : async Project {
    let id = generateId("project_");
    let timestamp = Time.now();
    let project = {
      id;
      name;
      bpm;
      timeSignatureNumerator;
      timeSignatureDenominator;
      createdAt = timestamp;
      updatedAt = timestamp;
    };
    projects.add(id, project);
    project;
  };

  public query ({ caller }) func getProject(id : Text) : async ?Project {
    projects.get(id);
  };

  public shared ({ caller }) func updateProject(
    id : Text,
    name : Text,
    bpm : Nat,
    timeSigNum : Nat,
    timeSigDen : Nat,
  ) : async Project {
    switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?existingProject) {
        let updatedProject = {
          id = existingProject.id;
          name;
          bpm;
          timeSignatureNumerator = timeSigNum;
          timeSignatureDenominator = timeSigDen;
          createdAt = existingProject.createdAt;
          updatedAt = Time.now();
        };
        projects.add(id, updatedProject);
        updatedProject;
      };
    };
  };

  public query ({ caller }) func listProjects() : async [Project] {
    projects.values().toArray();
  };

  public shared ({ caller }) func deleteProject(id : Text) : async Bool {
    switch (projects.get(id)) {
      case (null) { false };
      case (?_) {
        let projectTracks = getProjectTracks(id);
        projectTracks.forEach(func(trackId) { tracks.remove(trackId) });
        projects.remove(id);
        true;
      };
    };
  };

  public shared ({ caller }) func addTrack(
    projectId : Text,
    name : Text,
    color : Text,
  ) : async Track {
    switch (projects.get(projectId)) {
      case (null) { Runtime.trap("Project not found") };
      case (?_) {
        let id = generateId("track_");
        let track = {
          id;
          projectId;
          name;
          color;
          volume = 0.7;
          pan = 0.0;
          muted = false;
          soloed = false;
          effectsChain = "";
          order = 0;
        };
        tracks.add(id, track);
        track;
      };
    };
  };

  public shared ({ caller }) func updateTrack(
    trackId : Text,
    name : Text,
    color : Text,
    volume : Float,
    pan : Float,
    muted : Bool,
    soloed : Bool,
    effectsChain : Text,
    order : Nat,
  ) : async Track {
    switch (tracks.get(trackId)) {
      case (null) { Runtime.trap("Track not found") };
      case (?existingTrack) {
        let updatedTrack = {
          id = existingTrack.id;
          projectId = existingTrack.projectId;
          name;
          color;
          volume;
          pan;
          muted;
          soloed;
          effectsChain;
          order;
        };
        tracks.add(trackId, updatedTrack);
        updatedTrack;
      };
    };
  };

  public shared ({ caller }) func deleteTrack(trackId : Text) : async Bool {
    switch (tracks.get(trackId)) {
      case (null) { false };
      case (?_) {
        tracks.remove(trackId);
        true;
      };
    };
  };

  public query ({ caller }) func getTracksForProject(projectId : Text) : async [Track] {
    tracks.values().toArray().filter(func(track) { track.projectId == projectId });
  };
};
