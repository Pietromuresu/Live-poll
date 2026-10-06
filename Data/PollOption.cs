namespace Live_poll.Data;

public class PollOption
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public string Text { get; set; } = string.Empty;

    public Poll Poll { get; set; } = null!;
    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
}
